import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use Edge runtime for even faster startup/response

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming event
    const event = await req.json();

    // 2. Fire-and-forget invoke of the Supabase Edge Function
    // We do NOT await the result because Vercel charges for duration.
    // We just want to ensure the request is sent.

    // Note: In some Vercel environments, unawaited promises might be cancelled 
    // when the function returns. 'waitUntil' is standard for Cloudflare/Vercel Edge, 
    // but on standard Serverless, it's safer to use a very short timeout or ensuring 
    // the fetch is fired. 
    // However, Supabase Functions are HTTP calls.

    // Construct the URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/process-postmark-webhook`;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Postmark Webhook] Missing Supabase env variables');
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    // Forward the payload
    // We use the service role key if available for security, or anon key.
    // Ideally, use Service Role to auth with the function if it checks for it.
    const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    // We use `waitUntil` if available (Edge Config) or just fire promise.
    const forwardRequest = fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify(event),
    }).catch(err => console.error('[Postmark Webhook] Failed to forward to Edge Function:', err));

    // If using Vercel Edge Runtime, usage of context.waitUntil is preferred but 
    // req.waitUntil is available in Next.js Middleware/Edge API Routes.
    // @ts-ignore
    if (req.after) {
      // @ts-ignore
      req.after(forwardRequest)
    } else if ((req as any).waitUntil) {
      (req as any).waitUntil(forwardRequest);
    } else {
      // Standard Serverless: we might need to await it briefly or trust the runtime not to kill immediately.
      // However, 'fire-and-forget' is risky in Lambdas. 
      // For guaranteed execution without waiting, we'd need a queue (QStash/Inngest).
      // BUT, since we want to save money, awaiting the HTTP request (which takes <200ms) 
      // is still MUCH cheaper than awaiting the DB calls (which took seconds).
      // So let's AWAIT the fetch. It's fast enough.
      await forwardRequest;
    }

    // 3. Respond immediately
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Postmark Webhook] Error forwarding webhook:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}