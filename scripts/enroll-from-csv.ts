/**
 * CSV-driven remediation runner
 * Reads a list of emails from a CSV (single column `email`) and processes each
 * through the existing `processRecord` flow exported by `enroll-missed-records.ts`.
 *
 * Usage examples:
 *  - ts-node scripts/enroll-from-csv.ts                          (defaults to CSV path + 10-record test)
 *  - ts-node scripts/enroll-from-csv.ts --file path/to/list.csv  (custom file)
 *  - ts-node scripts/enroll-from-csv.ts --full                   (process all rows)
 *  - ts-node scripts/enroll-from-csv.ts --limit 25               (process first 25 rows)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { processRecord, SystemioRecord } from './enroll-missed-records'

dotenv.config()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY env vars required')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// ---------- CLI helpers ----------
function getFlagValue(flag: string): string | undefined {
  const idx = process.argv.findIndex(a => a === flag)
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
  return undefined
}

const csvPath = getFlagValue('--file') || path.join('ProjectDocs', 'exports', 'unenrolled_emails_2025-07-02.csv')
const limitArg = getFlagValue('--limit')
const FULL_RUN = process.argv.includes('--full')
const LIMIT = FULL_RUN ? Infinity : limitArg ? Number(limitArg) : 10

// ---------- CSV reader ----------
function loadEmails(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && l.toLowerCase() !== 'email')
}

async function fetchSystemioRecord(email: string): Promise<SystemioRecord> {
  const { data, error } = await supabaseAdmin
    .from('systemeio')
    .select('*')
    .ilike('Email', email)
    .limit(1)
  if (error) {
    throw new Error(`systemeio lookup failed for ${email}: ${error.message}`)
  }
  if (data && data.length > 0) {
    const r = data[0]
    return {
      Email: String(r.Email || email),
      'First Name': String(r['First Name'] || ''),
      'Last Name': String(r['Last Name'] || ''),
      'Date Registered': String(r['Date Registered'] || ''),
      Tag: typeof r.Tag === 'string' ? r.Tag : ''
    }
  }
  // fallback minimal record if not in systemeio
  return {
    Email: email,
    'First Name': '',
    'Last Name': '',
    'Date Registered': new Date().toISOString(),
    Tag: ''
  }
}

async function main() {
  console.log('=== CSV REMEDIATION RUN ===')
  console.log(`CSV file: ${csvPath}`)
  const emails = loadEmails(csvPath)
  console.log(`Found ${emails.length} emails in CSV`)

  const slice = emails.slice(0, LIMIT === Infinity ? emails.length : LIMIT)
  console.log(`Processing ${slice.length} record(s)...`)

  const results: { email: string; success: boolean; error?: string }[] = []

  for (const email of slice) {
    try {
      const record = await fetchSystemioRecord(email)
      const res = await processRecord(record)
      results.push({ email, success: res.success, error: res.error })
    } catch (err: unknown) {
      const e = err as Error
      console.error(`❌ ${email}: ${e.message}`)
      results.push({ email, success: false, error: e.message })
    }
  }

  const ok = results.filter(r => r.success).length
  const fail = results.length - ok
  console.log(`\n=== SUMMARY ===`)
  console.log(`✅ Success: ${ok}`)
  console.log(`❌ Failures: ${fail}`)
  if (fail > 0) {
    results.filter(r => !r.success).forEach(r => console.log(`- ${r.email}: ${r.error}`))
  }
  console.log('\nℹ️  Detailed audit trail saved via original helpers (migration_log etc.).')
}

// Execute unconditionally when this script is run directly
// Simple detection: compare invoked script path to this file
const isCliExecution = (() => {
  const invoked = process.argv[1] || ''
  return invoked.endsWith('enroll-from-csv.ts') || invoked.endsWith('enroll-from-csv.js')
})()


if (isCliExecution) {
  main()
}
