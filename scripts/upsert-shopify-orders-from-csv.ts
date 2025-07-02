import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';


// -----------------------------------------------------------------------------
// ENV SETUP -------------------------------------------------------------------
// -----------------------------------------------------------------------------
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL?.startsWith('http')
  ? process.env.SUPABASE_URL
  : undefined;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL (REST) or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------------------------
// TYPES -----------------------------------------------------------------------
// -----------------------------------------------------------------------------
interface CsvRow {
  /** Ex: "#1860" */
  Name: string;
  Email: string;
  /** ISO string */
  'Created at': string;
  Total: string;
  'Financial Status': string;
  /** Line‐item specific columns */
  'Lineitem quantity': string;
  'Lineitem name': string;
  'Lineitem price': string;
  Id: string; // Shopify Order ID (numeric string)
}

interface GroupedOrder {
  orderNumber: number;
  shopifyOrderId: string;
  email: string | null;
  createdAt: string;
  total: number;
  financialStatus: string;
  lineItems: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

// -----------------------------------------------------------------------------
// CSV UTIL --------------------------------------------------------------------
// -----------------------------------------------------------------------------
function loadCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function groupRows(rows: CsvRow[]): GroupedOrder[] {
  const map = new Map<number, GroupedOrder>();
  for (const row of rows) {
    const orderNumber = parseInt(row.Name.replace('#', '').trim(), 10);
    if (!orderNumber) continue;
    const existing = map.get(orderNumber);
    const item = {
      name: row['Lineitem name'],
      quantity: parseInt(row['Lineitem quantity'] || '0', 10) || 1,
      price: parseFloat(row['Lineitem price'] || '0') || 0,
    };
    if (existing) {
      existing.lineItems.push(item);
      existing.total += item.price * item.quantity;
      if (!existing.email && row.Email) {
        existing.email = row.Email.toLowerCase();
      }
    } else {
      map.set(orderNumber, {
        orderNumber,
        shopifyOrderId: row.Id,
        email: row.Email?.toLowerCase() || null,
        createdAt: row['Created at'],
        total: parseFloat(row.Total || '0') || item.price * item.quantity,
        financialStatus: row['Financial Status'] || 'paid',
        lineItems: [item],
      });
    }
  }
  return Array.from(map.values());
}

// -----------------------------------------------------------------------------
// SUPABASE HELPERS ------------------------------------------------------------
// -----------------------------------------------------------------------------
async function ensureCustomer(email: string | null): Promise<string | null> {
  if (!email) return null;
  const lower = email.toLowerCase();
  // Try to find existing customer
  const { data: existing } = await supabase
    .from('shopify_customers')
    .select('id')
    .eq('email', lower)
    .maybeSingle();
  if (existing?.id) return existing.id;

  // We cannot create a new customer without a Shopify numeric ID due to NOT NULL constraint.
  // Leave order.customer_id null; downstream remediation scripts will link by email when possible.
  return null;
}

async function ensureOrder(group: GroupedOrder, customerId: string | null): Promise<string | null> {
  // Check if order already exists by order_number or shopify_order_id
  const { data: existing } = await supabase
    .from('shopify_orders')
    .select('id, email')
    .or(`order_number.eq.${group.orderNumber},shopify_order_id.eq.${group.shopifyOrderId}`)
    .maybeSingle();
  if (existing?.id) {
    if (!existing.email && group.email) {
      await supabase
        .from('shopify_orders')
        .update({ email: group.email })
        .eq('id', existing.id);
    }
    return existing.id;
  }

  // Insert minimal order record
  const insertData: any = {
    shopify_order_id: group.shopifyOrderId,
    order_number: group.orderNumber,
    customer_id: customerId,
    email: group.email,
    total_price: group.total,
    financial_status: group.financialStatus,
    created_at: group.createdAt,
  };
  const { data, error } = await supabase
    .from('shopify_orders')
    .insert(insertData)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Failed to insert order', group.orderNumber, error.message);
    return null;
  }
  return data?.id || null;
}

async function upsertLineItems(orderId: string, shopifyOrderId: string, items: GroupedOrder['lineItems']) {
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    // Generate synthetic numeric line-item ID derived from the original Shopify order id.
    // Shopify numeric IDs are ≤ 13 digits (~1e13). Multiply by 1000 then add the line-item index
    // to ensure uniqueness while remaining within JS safe integer (≤ 9e15) and Postgres BIGINT range.
    const base = Number(shopifyOrderId);
    const syntheticId = base * 1000 + idx;
    const { error } = await supabase
      .from('shopify_order_items')
      .upsert(
        {
          shopify_line_item_id: syntheticId,
          order_id: orderId,
          title: it.name,
          quantity: it.quantity,
          price: it.price,
        },
        { onConflict: 'shopify_line_item_id' },
      );
    if (error) {
      console.error('Failed to upsert line item', syntheticId, error.message);
    }
  }
}

// -----------------------------------------------------------------------------
// MAIN ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
async function main() {
  const csvPath = path.resolve(process.cwd(), 'Order Export from Grace Buevarra.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  console.log('Reading CSV…');
  const rows = loadCsv(csvPath);
  console.log(`Parsed ${rows.length} rows`);
  const orders = groupRows(rows);
  console.log(`Grouped into ${orders.length} unique orders`);

  let processed = 0;
  for (const order of orders) {
    const customerId = await ensureCustomer(order.email);
    const orderId = await ensureOrder(order, customerId);
    if (orderId) {
      await upsertLineItems(orderId, order.shopifyOrderId, order.lineItems);
      processed += 1;
      if (processed % 50 === 0) console.log(`Processed ${processed}/${orders.length}`);
    }
  }

  console.log(`\nFinished. Upserted ${processed} orders.`);
}

// Execute when the script is run directly (ESM/tsx friendly)
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
