import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/dashboard/update-profiles
// Upserts all unified profiles from Auth + systemeio, deduplicated and normalized.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  let upserted = 0;
  let errors: { email: string; error: string }[] = [];
  let upsertedEmails: string[] = [];

  try {
    // 1. Fetch all Auth users (id, email)
    let page = 1;
    const perPage = 1000;
    let authUsers: { id: string; email: string }[] = [];
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      authUsers.push(...users.map((u: any) => ({ id: u.id, email: String(u.email || '').trim().toLowerCase() })));
      if (users.length < perPage) break;
      page++;
    }
    // 2. Fetch all systemeio profiles (email, first/last name, tag, date registered)
    const { data: sysRows, error: sysError } = await admin
      .from('systemeio')
      .select('Email, "First name", "Last name", Tag, "Date Registered"');
    if (sysError) throw sysError;
    // 3. Build a map of email -> systemeio profile (prefer latest date registered)
    const sysMap = new Map<string, any>();
    (sysRows ?? []).forEach((row: any) => {
      const email = String(row.Email || '').trim().toLowerCase();
      if (!email) return;
      if (!sysMap.has(email) || (row["Date Registered"] && (!sysMap.get(email)["Date Registered"] || row["Date Registered"] > sysMap.get(email)["Date Registered"]))) {
        sysMap.set(email, row);
      }
    });
    // 4. For each Auth user, merge with systemeio profile and upsert
    for (const user of authUsers) {
      if (!user.email) continue;
      const s = sysMap.get(user.email);
      const tagsArr = s && s.Tag ? String(s.Tag).split(',').map((t: string) => t.trim()).filter(Boolean) : null;
      const tagsValue = tagsArr && tagsArr.length > 0 ? '{' + tagsArr.join(',') + '}' : null;
      const profile = {
        id: user.id,
        email: user.email,
        first_name: s ? s["First name"] : null,
        last_name: s ? s["Last name"] : null,
        phone: null,
        tags: tagsValue,
        acquisition_source: s && s.Tag ? (s.Tag.toLowerCase().includes('squeeze') ? 'squeeze' : (s.Tag.toLowerCase().includes('canva') ? 'canva' : null)) : null,
        created_at: s && s["Date Registered"] ? s["Date Registered"] : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await admin
        .from('unified_profiles')
        .upsert([profile], { onConflict: ['id'], defaultToNull: true });
      if (upsertError) {
        errors.push({ email: user.email, error: upsertError.message });
        continue;
      }
      upserted++;
      upsertedEmails.push(user.email);
    }
    return NextResponse.json({
      success: true,
      upserted,
      errors,
      upsertedEmails: upsertedEmails.slice(0, 10),
      message: `Upserted ${upserted} profiles. ${errors.length} errors.`
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Profile migration failed',
      error: err,
    }, { status: 500 });
  }
} 