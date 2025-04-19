import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Normalize a value for comparison:
 * - Treat null, undefined, or empty string as null
 * - Trim and lowercase strings
 */
function norm(val: any): any {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') return val.trim().toLowerCase();
  return val;
}

/**
 * Normalize tags for comparison:
 * - Accepts an array or comma-separated string
 * - Cleans, trims, lowercases, removes empties, sorts alphabetically
 * - Returns null if no valid tags
 */
function normTags(val: any): string[] | null {
  if (!val) return null;
  // Convert to array
  const arr = Array.isArray(val)
    ? val
    : String(val)
        .replace(/[{}]/g, '') // remove curly braces if present
        .split(',')
        .map(t => t.trim());
  // Clean and normalize
  const cleaned = arr
    .map(String)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length ? cleaned.sort() : null;
}

export async function POST(req: NextRequest) {
  const admin = getAdminClient();

  // Counter for total inserts+updates
  let upserted = 0;
  // Collections for batched operations
  const newProfiles: any[] = [];
  const updateProfiles: any[] = [];

  // Counters & logs for auditing
  let skipped = 0;
  const errors: { email: string; error: string }[] = [];
  const upsertedEmails: string[] = [];
  const skippedEmails: string[] = [];
  const changeLogs: { email: string; fields: string[] }[] = [];

  try {
    console.log('[update-profiles] Migration started');

    // 1. Fetch all Auth users via pagination in pages of 1000
    const authUsers: { id: string; email: string }[] = [];
    const perPage = 1000;
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      authUsers.push(
        ...users.map(u => ({
          id: u.id,
          email: String(u.email || '').trim().toLowerCase(),
        }))
      );
      if (users.length < perPage) break; // last page
      page++;
    }
    console.log(`[update-profiles] Fetched ${authUsers.length} Auth users`);

    // 2. Build a map of Systeme.io profiles, keyed by email,
    //    preferring the most recent 'Date Registered'
    const sysMap = new Map<string, any>();
    const batchSize = 1000;
    for (let offset = 0; ; offset += batchSize) {
      const { data: rows, error } = await admin
        .from('systemeio')
        .select('Email, "First name", "Last name", Tag, "Date Registered"')
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!rows?.length) break;
      for (const row of rows) {
        const email = String(row.Email || '').trim().toLowerCase();
        if (!email) continue;
        const existing = sysMap.get(email);
        // Replace only if newer
        if (
          !existing ||
          (row['Date Registered'] &&
            (!existing['Date Registered'] || row['Date Registered'] > existing['Date Registered']))
        ) {
          sysMap.set(email, row);
        }
      }
      if (rows.length < batchSize) break;
    }
    console.log(`[update-profiles] Built systemeio map with ${sysMap.size} entries`);

    // 3. Fetch current unified_profiles into a map by user ID
    const { data: existingProfiles, error: existErr } = await admin
      .from('unified_profiles')
      .select('id, email, first_name, last_name, phone, tags, acquisition_source, created_at');
    if (existErr) throw existErr;
    const existingMap = new Map<string, any>(
      existingProfiles?.map(p => [p.id, p])
    );

    // 4. Diff loop: determine which profiles need insert vs update vs skip
    for (const user of authUsers) {
      if (!user.email) continue;
      const sys = sysMap.get(user.email);
      const existing = existingMap.get(user.id);

      // Build the merged profile object
      const profile = {
        id: user.id,
        email: user.email,
        first_name: sys?.['First name'] || existing?.first_name || null,
        last_name:  sys?.['Last name']  || existing?.last_name  || null,
        phone:       existing?.phone    || null,
        tags:        normTags(sys?.Tag) || existing?.tags       || null,
        acquisition_source:
          sys?.Tag?.toLowerCase().includes('squeeze')
            ? 'squeeze'
            : sys?.Tag?.toLowerCase().includes('canva')
            ? 'canva'
            : existing?.acquisition_source || null,
        created_at:  existing
          ? existing.created_at
          : sys?.['Date Registered'] || new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      };

      // Identify changed fields
      const changed: string[] = [];
      if (!existing || norm(profile.first_name) !== norm(existing.first_name)) changed.push('first_name');
      if (!existing || norm(profile.last_name) !== norm(existing.last_name))   changed.push('last_name');
      if (!existing || norm(profile.phone) !== norm(existing.phone))           changed.push('phone');
      if (
        !existing ||
        JSON.stringify(normTags(profile.tags)) !== JSON.stringify(normTags(existing.tags))
      ) changed.push('tags');
      if (
        !existing ||
        norm(profile.acquisition_source) !== norm(existing.acquisition_source)
      ) changed.push('acquisition_source');

      if (changed.length === 0) {
        // No meaningful changes: skip
        skipped++;
        if (skippedEmails.length < 10) skippedEmails.push(user.email);
        continue;
      }

      // Queue for insert or update
      if (!existing) {
        newProfiles.push(profile);
      } else {
        updateProfiles.push(profile);
      }
      changeLogs.push({ email: user.email, fields: changed });
    }

    // 5a. Batch-insert new profiles; skip duplicates
    if (newProfiles.length > 0) {
      const { data: inserted, error: insertError } = await admin
        .from('unified_profiles')
        .insert(newProfiles, { skipDuplicates: true });
      if (insertError) {
        insertError.message
          .split(';')
          .forEach(msg => errors.push({ email: 'insert batch', error: msg }));
      } else {
        upserted += inserted.length;
        upsertedEmails.push(...inserted.slice(0, 10).map(p => p.email));
      }
    }

    // 5b. Individually update only profiles with diffs
    for (const p of updateProfiles) {
      const { error: updateError } = await admin
        .from('unified_profiles')
        .update({
          first_name:         p.first_name,
          last_name:          p.last_name,
          phone:              p.phone,
          tags:               p.tags,
          acquisition_source: p.acquisition_source,
          updated_at:         p.updated_at,
        })
        .eq('id', p.id);
      if (updateError) {
        errors.push({ email: p.email, error: updateError.message });
      } else {
        upserted++;
        if (upsertedEmails.length < 10) upsertedEmails.push(p.email);
      }
    }

    // 6. Final logging
    console.log(
      `[update-profiles] Completed: upserted=${upserted}, skipped=${skipped}, errors=${errors.length}`
    );

    // 7. Return summary JSON
    return NextResponse.json({
      success: true,
      upserted,
      skipped,
      errors,
      upsertedEmails,
      skippedEmails,
      changeLogs,
    });
  } catch (err: any) {
    console.error('[update-profiles] Fatal error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Migration failed', error: err },
      { status: 500 }
    );
  }
}