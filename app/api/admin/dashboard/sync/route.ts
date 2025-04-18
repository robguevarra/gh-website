import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/dashboard/sync
// This endpoint creates Supabase Auth users for all Xendit users with PAID status for 'Papers to Profits' who do not already exist in Auth.
export const dynamic = 'force-dynamic';

// Helper to fetch all users from Supabase Auth (handles pagination)
async function fetchAllAuthUserEmails(admin: ReturnType<typeof getAdminClient>) {
  const emails = new Set<string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    users.forEach((u: any) => {
      if (u.email) emails.add(String(u.email).trim().toLowerCase());
    });
    if (users.length < perPage) break;
    page++;
  }
  return emails;
}

// Helper to fetch all PAID P2P emails from Xendit (handles pagination)
async function fetchAllXenditEmails(admin: ReturnType<typeof getAdminClient>) {
  const emails = new Set<string>();
  const batchSize = 1000;
  let offset = 0;
  while (true) {
    const { data: xenditRows, error: xenditError } = await admin
      .from('xendit')
      .select('Email')
      .eq('Status', 'PAID')
      .ilike('Description', '%papers to profits%')
      .range(offset, offset + batchSize - 1);
    if (xenditError) throw xenditError;
    const batchEmails = (xenditRows ?? [])
      .map((row: any) => String(row.Email || '').trim().toLowerCase())
      .filter((e: string) => !!e);
    batchEmails.forEach((e) => emails.add(e));
    if (!xenditRows || xenditRows.length < batchSize) break;
    offset += batchSize;
  }
  return emails;
}

// Helper to fetch all PAID P2P emails from systemeio (handles pagination)
async function fetchAllSystemeioEmails(admin: ReturnType<typeof getAdminClient>) {
  const emails = new Set<string>();
  const batchSize = 1000;
  let offset = 0;
  while (true) {
    const { data: sysRows, error: sysError } = await admin
      .from('systemeio')
      .select('Email, Tag')
      .ilike('Tag', '%paidp2p%')
      .range(offset, offset + batchSize - 1);
    if (sysError) throw sysError;
    const batchEmails = (sysRows ?? [])
      .map((row: any) => String(row.Email || '').trim().toLowerCase())
      .filter((e: string) => !!e);
    batchEmails.forEach((e) => emails.add(e));
    if (!sysRows || sysRows.length < batchSize) break;
    offset += batchSize;
  }
  return emails;
}

export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  const DEFAULT_PASSWORD = 'graceful2025';
  let created = 0;
  let skipped = 0;
  let errors: { email: string; error: string }[] = [];
  let createdEmails: string[] = [];
  let skippedEmails: string[] = [];

  try {
    // 1. Fetch all PAID P2P emails from Xendit and systemeio (paginated)
    const xenditEmails = await fetchAllXenditEmails(admin);
    const systemeioEmails = await fetchAllSystemeioEmails(admin);

    // 2. Union both sets (normalize, dedupe)
    const allPaidEmails = new Set<string>([...xenditEmails, ...systemeioEmails]);

    // 3. Get all existing Auth user emails (with pagination)
    const existingEmails = await fetchAllAuthUserEmails(admin);

    // 4. For each union email, create user if not exists
    for (const email of allPaidEmails) {
      if (!email || existingEmails.has(email)) {
        skipped++;
        skippedEmails.push(email);
        continue;
      }
      try {
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
        });
        if (createError) {
          errors.push({ email, error: createError.message });
          continue;
        }
        created++;
        createdEmails.push(email);
      } catch (err: any) {
        errors.push({ email, error: err.message || 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors,
      createdEmails: createdEmails.slice(0, 10), // sample
      skippedEmails: skippedEmails.slice(0, 10), // sample
      message: `Created ${created} users, skipped ${skipped}. ${errors.length} errors.`
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Migration failed',
      error: err,
    }, { status: 500 });
  }
} 