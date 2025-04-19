import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Defines the shape of an enrollment record for insert/update operations.
 */
type EnrollmentUpsert = {
  user_id: string;
  course_id: string;
  transaction_id: string;
  status: string;
  enrolled_at: string;
  expires_at: string | null;
};

export async function POST(req: NextRequest) {
  const admin = getAdminClient();

  // Diagnostic counters
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let totalTransactions = 0;

  // Buffers for batched operations
  const toInsert: EnrollmentUpsert[] = [];
  const toUpdate: EnrollmentUpsert[] = [];

  // Error log for per-record failures
  const errors: { user_id: string; error: string }[] = [];

  try {
    console.log('[update-enrollments] Migration started');

    // 1. Lookup the course_id by title rather than name
    const { data: course, error: courseError } = await admin
      .from('courses')
      .select('id')
      .eq('title', 'Papers to Profits')
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) throw new Error('Papers to Profits course not found');
    const course_id = course.id;
    console.log(`[update-enrollments] Target course_id: ${course_id}`);

    // 2. Load all existing enrollments via pagination for diffing (avoids default 1000-row limit)
    const existingMap = new Map<string, any>();
    const batchSize = 1000;
    for (let offset = 0; ; offset += batchSize) {
      const { data: batch, error } = await admin
        .from('enrollments')
        .select('user_id, transaction_id, status, enrolled_at')
        .eq('course_id', course_id)
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      for (const e of batch) {
        existingMap.set(e.user_id, e);
      }
      if (batch.length < batchSize) break;
    }
    console.log(
      `[update-enrollments] Loaded ${existingMap.size} existing enrollments`
    );

    // 3. Page through completed P2P transactions in batches
    const perPage = 1000;
    for (let offset = 0; ; offset += perPage) {
      const { data: txRows, error: txError } = await admin
        .from('transactions')
        .select('id, user_id, paid_at')
        .eq('status', 'completed')
        .eq('transaction_type', 'P2P')
        .range(offset, offset + perPage - 1);

      if (txError) throw txError;
      if (!txRows || txRows.length === 0) break;

      totalTransactions += txRows.length;
      console.log(
        `[update-enrollments] Fetched ${txRows.length} transactions (offset: ${offset})`
      );

      // 4. Classify each transaction as new, update, or skip
      for (const tx of txRows) {
        if (!tx.user_id || !tx.id) continue; // skip bad data

        const enrolled_at = tx.paid_at ?? new Date().toISOString();
        const record: EnrollmentUpsert = {
          user_id: tx.user_id,
          course_id,
          transaction_id: tx.id,
          status: 'active',
          enrolled_at,
          expires_at: null,
        };

        const existing = existingMap.get(tx.user_id);
        if (!existing) {
          toInsert.push(record);
        } else {
          const needsUpdate =
            existing.transaction_id !== record.transaction_id ||
            existing.status !== record.status ||
            existing.enrolled_at !== record.enrolled_at;
          if (needsUpdate) {
            toUpdate.push(record);
          } else {
            skippedCount++;
          }
        }
      }

      if (txRows.length < perPage) break;
    }

    // Deduplicate insert records: only one enrollment per user, choose latest
    {
      const originalToInsertLength = toInsert.length;
      const insertMap = new Map<string, EnrollmentUpsert>();
      for (const rec of toInsert) {
        const prev = insertMap.get(rec.user_id);
        if (
          !prev ||
          new Date(rec.enrolled_at) > new Date(prev.enrolled_at)
        ) {
          insertMap.set(rec.user_id, rec);
        }
      }
      // Replace toInsert with deduplicated array
      toInsert.splice(0, toInsert.length, ...Array.from(insertMap.values()));
      // Count how many potential duplicates were dropped
      skippedCount += originalToInsertLength - toInsert.length;
    }
    // 5a. Insert new enrollments in bulk (skip duplicates)
    if (toInsert.length > 0) {
      console.log(
        `[update-enrollments] Inserting ${toInsert.length} new enrollments`
      );
      const { data: inserted, error: insertError } = await admin
        .from('enrollments')
        .insert(toInsert, { skipDuplicates: true });
      if (insertError) {
        toInsert.forEach(r =>
          errors.push({ user_id: r.user_id, error: insertError.message })
        );
      } else {
        insertedCount = inserted.length;
      }
    }

    // 5b. Update only records that truly changed
    for (const rec of toUpdate) {
      const { error: updateError } = await admin
        .from('enrollments')
        .update({
          transaction_id: rec.transaction_id,
          status: rec.status,
          enrolled_at: rec.enrolled_at,
          expires_at: rec.expires_at,
        })
        .eq('user_id', rec.user_id)
        .eq('course_id', rec.course_id);

      if (updateError) {
        errors.push({ user_id: rec.user_id, error: updateError.message });
      } else {
        updatedCount++;
      }
    }

    // 6. Final summary
    console.log(
      `[update-enrollments] Completed: totalTx=${totalTransactions}, inserted=${insertedCount}, updated=${updatedCount}, skipped=${skippedCount}, errors=${errors.length}`
    );
    // 6b. Log a few sample errors for quick debugging
    if (errors.length > 0) {
      console.error('[update-enrollments] Sample errors:', errors.slice(0, 10));
    }

    // 7. Return migration summary
    return NextResponse.json({
      success: true,
      totalTransactions,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
      sampleErrors: errors.slice(0, 10),  // first 10 error details
    });
  } catch (err: any) {
    console.error('[update-enrollments] Fatal error:', err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Enrollment migration failed',
        errors,
      },
      { status: 500 }
    );
  }
}