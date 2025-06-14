import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Shopify sends the HMAC in this header
const SHOPIFY_HMAC_HEADER = 'x-shopify-hmac-sha256';

// Read the shared secret from environment variables
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Helper to verify Shopify webhook signature
function verifyShopifyWebhook(req: NextRequest, rawBody: Buffer, secret: string): boolean {
  const hmacHeader = req.headers.get(SHOPIFY_HMAC_HEADER) || '';
  // Create HMAC using the shared secret and the raw request body
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  // Compare the computed digest to the header
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

// Helper: Find unified_profile_id by email
async function findUnifiedProfileIdByEmail(supabase: any, email: string) {
  if (!email) return null;
  const { data, error } = await supabase
    .from('unified_profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) {
    console.error('Error finding unified_profile by email:', error);
    return null;
  }
  return data?.id || null;
}

// Enhanced upsert with structured logging and idempotency comments
async function upsertCustomer(supabase: any, payload: any, topic: string) {
  const email = payload.email?.toLowerCase() || null;
  const unified_profile_id = email ? await findUnifiedProfileIdByEmail(supabase, email) : null;
  const upsertData = {
    shopify_customer_id: payload.id,
    email,
    first_name: payload.first_name || null,
    last_name: payload.last_name || null,
    phone: payload.phone || null,
    accepts_marketing: payload.accepts_marketing || false,
    orders_count: payload.orders_count || 0,
    total_spent: payload.total_spent ? Number(payload.total_spent) : 0,
    state: payload.state || null,
    tags: payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : [],
    created_at: payload.created_at ? new Date(payload.created_at).toISOString() : null,
    updated_at: payload.updated_at ? new Date(payload.updated_at).toISOString() : null,
    unified_profile_id,
  };
  const { data, error } = await supabase.from('shopify_customers').upsert(upsertData, { onConflict: 'shopify_customer_id' }).select('id');
  if (error) {
    console.error(`[Shopify Webhook][${topic}] Customer upsert error`, {
      shopify_customer_id: payload.id,
      error,
      upsertData,
    });
  } else if (data && data.length === 0) {
    // No new row inserted/updated (idempotent duplicate)
    console.info(`[Shopify Webhook][${topic}] Customer upsert idempotent (duplicate)`, {
      shopify_customer_id: payload.id,
    });
  } else {
    console.info(`[Shopify Webhook][${topic}] Customer upserted`, {
      shopify_customer_id: payload.id,
    });
  }
}

// Enhanced upsert with structured logging and idempotency comments
async function upsertProduct(supabase: any, payload: any, topic: string) {
  const productData = {
    shopify_product_id: payload.id,
    title: payload.title,
    handle: payload.handle,
    product_type: payload.product_type,
    status: payload.status,
    created_at: payload.created_at ? new Date(payload.created_at).toISOString() : null,
    updated_at: payload.updated_at ? new Date(payload.updated_at).toISOString() : null,
    published_at: payload.published_at ? new Date(payload.published_at).toISOString() : null,
    vendor: payload.vendor,
    tags: payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : [],
  };
  const { data: product, error: productError } = await supabase
    .from('shopify_products')
    .upsert(productData, { onConflict: 'shopify_product_id' })
    .select('id');
  if (productError) {
    console.error(`[Shopify Webhook][${topic}] Product upsert error`, {
      shopify_product_id: payload.id,
      error: productError,
      productData,
    });
    return;
  } else if (product && product.length === 0) {
    console.info(`[Shopify Webhook][${topic}] Product upsert idempotent (duplicate)`, {
      shopify_product_id: payload.id,
    });
  } else {
    console.info(`[Shopify Webhook][${topic}] Product upserted`, {
      shopify_product_id: payload.id,
    });
  }
  // Upsert variants
  if (Array.isArray(payload.variants)) {
    for (const variant of payload.variants) {
      const variantData = {
        shopify_variant_id: variant.id,
        product_id: product?.[0]?.id,
        title: variant.title,
        sku: variant.sku,
        price: variant.price ? Number(variant.price) : null,
        compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
        created_at: variant.created_at ? new Date(variant.created_at).toISOString() : null,
        updated_at: variant.updated_at ? new Date(variant.updated_at).toISOString() : null,
      };
      const { data: variantResult, error: variantError } = await supabase
        .from('shopify_product_variants')
        .upsert(variantData, { onConflict: 'shopify_variant_id' })
        .select('id');
      if (variantError) {
        console.error(`[Shopify Webhook][${topic}] Variant upsert error`, {
          shopify_variant_id: variant.id,
          error: variantError,
          variantData,
        });
      } else if (variantResult && variantResult.length === 0) {
        console.info(`[Shopify Webhook][${topic}] Variant upsert idempotent (duplicate)`, {
          shopify_variant_id: variant.id,
        });
      } else {
        console.info(`[Shopify Webhook][${topic}] Variant upserted`, {
          shopify_variant_id: variant.id,
        });
      }
    }
  }
}

// Enhanced upsert with structured logging and idempotency comments
async function upsertOrder(supabase: any, payload: any, topic: string) {
  let customer_id = null;
  if (payload.customer && payload.customer.id) {
    const { data: customer } = await supabase
      .from('shopify_customers')
      .select('id')
      .eq('shopify_customer_id', payload.customer.id)
      .maybeSingle();
    customer_id = customer?.id || null;
  }
  const orderData = {
    shopify_order_id: payload.id,
    customer_id,
    order_number: payload.order_number?.toString() || null,
    email: payload.email?.toLowerCase() || null,
    phone: payload.phone || null,
    total_price: payload.total_price ? Number(payload.total_price) : null,
    subtotal_price: payload.subtotal_price ? Number(payload.subtotal_price) : null,
    total_tax: payload.total_tax ? Number(payload.total_tax) : null,
    total_discounts: payload.total_discounts ? Number(payload.total_discounts) : null,
    currency: payload.currency || null,
    financial_status: payload.financial_status || null,
    fulfillment_status: payload.fulfillment_status || null,
    landing_site: payload.landing_site || null,
    referring_site: payload.referring_site || null,
    source_name: payload.source_name || null,
    tags: payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : [],
    created_at: payload.created_at ? new Date(payload.created_at).toISOString() : null,
    updated_at: payload.updated_at ? new Date(payload.updated_at).toISOString() : null,
    processed_at: payload.processed_at ? new Date(payload.processed_at).toISOString() : null,
    closed_at: payload.closed_at ? new Date(payload.closed_at).toISOString() : null,
    cancelled_at: payload.cancelled_at ? new Date(payload.cancelled_at).toISOString() : null,
  };
  const { data: order, error: orderError } = await supabase
    .from('shopify_orders')
    .upsert(orderData, { onConflict: 'shopify_order_id' })
    .select('id');
  if (orderError) {
    console.error(`[Shopify Webhook][${topic}] Order upsert error`, {
      shopify_order_id: payload.id,
      error: orderError,
      orderData,
    });
    return;
  } else if (order && order.length === 0) {
    console.info(`[Shopify Webhook][${topic}] Order upsert idempotent (duplicate)`, {
      shopify_order_id: payload.id,
    });
  } else {
    console.info(`[Shopify Webhook][${topic}] Order upserted`, {
      shopify_order_id: payload.id,
    });
  }
  if (Array.isArray(payload.line_items)) {
    for (const item of payload.line_items) {
      const itemData = {
        shopify_line_item_id: item.id,
        order_id: order?.[0]?.id,
        product_id: null,
        variant_id: null,
        shopify_product_id: item.product_id,
        shopify_variant_id: item.variant_id,
        title: item.title,
        variant_title: item.variant_title,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price ? Number(item.price) : null,
        total_discount: item.total_discount ? Number(item.total_discount) : null,
        vendor: item.vendor,
      };
      const { data: itemResult, error: itemError } = await supabase
        .from('shopify_order_items')
        .upsert(itemData, { onConflict: 'shopify_line_item_id' })
        .select('id');
      if (itemError) {
        console.error(`[Shopify Webhook][${topic}] Order item upsert error`, {
          shopify_line_item_id: item.id,
          error: itemError,
          itemData,
        });
      } else if (itemResult && itemResult.length === 0) {
        console.info(`[Shopify Webhook][${topic}] Order item upsert idempotent (duplicate)`, {
          shopify_line_item_id: item.id,
        });
      } else {
        console.info(`[Shopify Webhook][${topic}] Order item upserted`, {
          shopify_line_item_id: item.id,
        });
      }
    }
  }
}

// Main handler for Shopify webhooks
export async function POST(req: NextRequest) {
  // Defensive: Ensure secret is set
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.error('Shopify webhook secret not set in environment variables.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Read the raw request body as a buffer
  const rawBody = Buffer.from(await req.arrayBuffer());

  // Verify the webhook signature
  const isVerified = verifyShopifyWebhook(req, rawBody, SHOPIFY_WEBHOOK_SECRET);
  if (!isVerified) {
    // Log and reject if verification fails
    console.warn('Shopify webhook verification failed.');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the JSON payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('Failed to parse Shopify webhook payload:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Extract event type from headers
  const topic = req.headers.get('x-shopify-topic') || 'unknown';
  const shopDomain = req.headers.get('x-shopify-shop-domain') || 'unknown';

  // Log the event for now (extend with upsert logic later)
  console.log(`[Shopify Webhook] Topic: ${topic}, Shop: ${shopDomain}`);
  console.log('Payload:', payload);

  const supabase = await createServiceRoleClient();
  try {
    if (topic.startsWith('customers/')) {
      await upsertCustomer(supabase, payload, topic);
    } else if (topic.startsWith('products/')) {
      await upsertProduct(supabase, payload, topic);
    } else if (topic.startsWith('orders/')) {
      await upsertOrder(supabase, payload, topic);
    } else {
      console.log(`[Shopify Webhook] Unhandled topic: ${topic}`);
    }
  } catch (err) {
    console.error('Webhook upsert error:', err, { topic, payload });
    return NextResponse.json({ error: 'Upsert error' }, { status: 500 });
  }

  // Respond with 200 OK to acknowledge receipt
  return NextResponse.json({ ok: true });
}

// TODO: Add async/background processing for scale
// TODO: Add more robust runtime validation and normalization
// TODO: Add more granular error logging and alerting
// Note: This handler is for analytics ingestion only, not e-commerce/storefront logic 