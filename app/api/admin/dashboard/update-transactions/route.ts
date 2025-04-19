import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Shape of a transaction record for insert/update operations.
 */
type TransactionUpsert = {
  user_id: string;
  external_id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  transaction_type: string;
  payment_method: string | null;
  created_at: string | null;
  paid_at: string | null;
  settled_at: string | null;
  expires_at: string | null;
  updated_at: string;
};

// POST /api/admin/dashboard/update-transactions
// Migrates and upserts all payment records from xendit into the transactions table, normalized and linked to unified profiles.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let totalXendit = 0;
  const toInsert: TransactionUpsert[] = [];
  const toUpdate: TransactionUpsert[] = [];
  const errors: { external_id: string; error: string }[] = [];

  try {
    // Determine last synced created_at for incremental sync
    const { data: lastSync, error: lastSyncErr } = await admin
      .from('transactions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastSyncErr) throw lastSyncErr;
    const since = lastSync?.created_at || new Date(0).toISOString();
    console.log(`[update-transactions] Syncing transactions created after ${since}`);

    // Load all profiles for email lookup via pagination
    const profileMap = new Map<string, string>();
    {
      const batchSize = 1000;
      for (let offset = 0; ; offset += batchSize) {
        const { data: batch, error } = await admin
          .from('unified_profiles')
          .select('id, email')
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        for (const p of batch) {
          profileMap.set(String(p.email).trim().toLowerCase(), p.id);
        }
        if (batch.length < batchSize) break;
      }
    }

    // Load all existing transactions for diffing via pagination
    const existingMap = new Map<string, any>();
    {
      const batchSize = 1000;
      for (let offset = 0; ; offset += batchSize) {
        const { data: batch, error } = await admin
          .from('transactions')
          .select('external_id, user_id, amount, currency, status, transaction_type, payment_method, paid_at, settled_at, expires_at')
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (!batch || batch.length === 0) break;
        for (const t of batch) {
          existingMap.set(t.external_id, t);
        }
        if (batch.length < batchSize) break;
      }
    }

    // 1. Fetch all Xendit payment records via pagination
    const perPage = 1000;
    for (let offset = 0; ; offset += perPage) {
      const { data: xenditRows, error: xError } = await admin
        .from('xendit')
        .select(
          'Email, "External ID", Amount, Currency, Status, Description, "Payment Method", "Created Timestamp", "Paid Timestamp", "Settled Timestamp", "Expiry Date"'
        )
        .gte('Created Timestamp', since)
        .order('Created Timestamp', { ascending: true })
        .range(offset, offset + perPage - 1);
      if (xError) throw xError;
      if (!xenditRows || xenditRows.length === 0) break;
      totalXendit += xenditRows.length;
      console.log(`[update-transactions] Fetched ${xenditRows.length} xendit rows (offset ${offset})`);
      for (const row of xenditRows) {
        const email = String(row["Email"] || '').trim().toLowerCase();
        const user_id = profileMap.get(email) ?? null;
        const external_id = String(row["External ID"] || '');
        if (!user_id || !external_id) {
          skippedCount++;
          continue;
        }
        // Normalize status
        let status = 'pending';
        if (row["Status"] === 'PAID' || row["Status"] === 'SETTLED') status = 'completed';
        else if (row["Status"] === 'EXPIRED') status = 'expired';
        // Normalize type
        let transaction_type = 'Other';
        if (typeof row["Description"] === 'string') {
          const desc = row["Description"].toLowerCase();
          if (desc.includes('papers to profits')) transaction_type = 'P2P';
          else if (desc.includes('canva')) transaction_type = 'Canva';
        }
        const record: TransactionUpsert = {
          user_id,
          external_id,
          amount: row["Amount"] ?? null,
          currency: row["Currency"] ?? null,
          status,
          transaction_type,
          payment_method: row["Payment Method"] ?? null,
          created_at: row["Created Timestamp"] ? new Date(row["Created Timestamp"]).toISOString() : null,
          paid_at: row["Paid Timestamp"] ? new Date(row["Paid Timestamp"]).toISOString() : null,
          settled_at: row["Settled Timestamp"] ? new Date(row["Settled Timestamp"]).toISOString() : null,
          expires_at: row["Expiry Date"] ? new Date(row["Expiry Date"]).toISOString() : null,
          updated_at: new Date().toISOString(),
        };
        const existing = existingMap.get(external_id);
        if (!existing) {
          toInsert.push(record);
        } else {
          // Determine if any core fields differ
          const changed =
            existing.user_id !== record.user_id ||
            existing.amount !== record.amount ||
            existing.currency !== record.currency ||
            existing.status !== record.status ||
            existing.transaction_type !== record.transaction_type ||
            existing.payment_method !== record.payment_method ||
            existing.paid_at !== record.paid_at ||
            existing.settled_at !== record.settled_at ||
            existing.expires_at !== record.expires_at;
          if (changed) {
            toUpdate.push(record);
          } else {
            skippedCount++;
          }
        }
      }
      if (xenditRows.length < perPage) break;
    }

    // Deduplicate inserts
    {
      const map = new Map<string, TransactionUpsert>();
      for (const r of toInsert) {
        map.set(r.external_id, r);
      }
      toInsert.splice(0, toInsert.length, ...map.values());
    }

    console.log(`[update-transactions] Records classified: toInsert=${toInsert.length}, toUpdate=${toUpdate.length}, skipped so far=${skippedCount}`);

    // Insert new transactions
    if (toInsert.length) {
      console.log(`[update-transactions] Inserting ${toInsert.length} new transactions`);
      const { data: inserted, error: insertError } = await admin
        .from('transactions')
        .insert(toInsert, { skipDuplicates: true });
      if (insertError) {
        toInsert.forEach(r => errors.push({ external_id: r.external_id, error: insertError.message }));
      } else {
        insertedCount = inserted.length;
      }
    }
    // Update changed transactions
    for (const rec of toUpdate) {
      const { error: updateError } = await admin
        .from('transactions')
        .update({
          user_id: rec.user_id,
          amount: rec.amount,
          currency: rec.currency,
          status: rec.status,
          transaction_type: rec.transaction_type,
          payment_method: rec.payment_method,
          paid_at: rec.paid_at,
          settled_at: rec.settled_at,
          expires_at: rec.expires_at,
          updated_at: rec.updated_at,
        })
        .eq('external_id', rec.external_id);
      if (updateError) {
        errors.push({ external_id: rec.external_id, error: updateError.message });
      } else {
        updatedCount++;
      }
    }

    console.log(
      `[update-transactions] Completed: totalXendit=${totalXendit}, inserted=${insertedCount}, updated=${updatedCount}, skipped=${skippedCount}, errors=${errors.length}`
    );
    if (errors.length) {
      console.error('[update-transactions] Sample errors:', errors.slice(0,10));
    }

    return NextResponse.json({
      success: true,
      totalXendit,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
      sampleErrors: errors.slice(0,10),
    });
  } catch (err: any) {
    // Log the unexpected fatal error
    console.error('[update-transactions] Fatal error:', err);
    // Log any collected insert/update errors
    if (errors.length) {
      console.error('[update-transactions] Collected errors:', errors);
    }
    // Return full error details along with any record-level errors
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Transaction migration failed',
        error: err,
        errors,
        sampleErrors: errors.slice(0, 10),
      },
      { status: 500 }
    );
  }
}