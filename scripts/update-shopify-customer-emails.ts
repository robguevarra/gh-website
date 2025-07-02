import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Prefer a REST endpoint URL (https://<ref>.supabase.co). Fallback to SUPABASE_URL if it already is a REST URL.
// The script purposely rejects Postgres connection strings.
const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_URL = RAW_SUPABASE_URL && RAW_SUPABASE_URL.startsWith('http')
  ? RAW_SUPABASE_URL
  : undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) {
  console.error('SUPABASE_URL must be the REST URL, e.g. https://<project-ref>.supabase.co');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type CsvRow = {
  order_name: string;
  email: string;
};

function loadCsv(filepath: string): CsvRow[] {
  const input = fs.readFileSync(filepath, "utf-8");
  const records: any[] = parse(input, {
    columns: false,
    skip_empty_lines: true,
  });

  return records.map((row) => {
    const orderName: string = (row[0] || "").trim();
    const email: string = (row[1] || "").trim();
    return { order_name: orderName, email };
  });
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "Order Export from Grace Buevarra.csv");
  const rows = loadCsv(csvPath);
  console.log(`Loaded ${rows.length} CSV rows`);

  let processed = 0;
  for (const { order_name, email } of rows) {
    if (!email || !order_name) continue;

    // Parse order number (integer) from CSV value like "#1860"
    const order_number = parseInt(order_name.replace('#', '').trim(), 10);
    if (!order_number) continue;

    // Look up order by order_number column (integer)
    const { data: order, error: orderErr } = await supabase
      .from('shopify_orders')
      .select('id, customer_id')
      .eq('order_number', order_number)
      .maybeSingle();

    if (orderErr) {
      console.error(`Error fetching order ${order_name}:`, orderErr.message);
      continue;
    }
    if (!order || !order.customer_id) continue;

    // Update customer email if missing or different
    await supabase
      .from("shopify_customers")
      .update({ email: email.toLowerCase() })
      .eq("id", order.customer_id);

    // Attempt to link unified_profile
    const { data: profile } = await supabase
      .from("unified_profiles")
      .select("id")
      .ilike("email", email.toLowerCase())
      .maybeSingle();

    if (profile) {
      await supabase
        .from("shopify_customers")
        .update({ unified_profile_id: profile.id })
        .eq("id", order.customer_id);
    }

    processed += 1;
    if (processed % 50 === 0) console.log(`Processed ${processed} rows...`);
  }

  console.log(`Finished processing ${processed} rows.`);
}

main().then(() => {
  console.log("Done.");
});
