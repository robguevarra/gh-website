import { createHash } from 'crypto';

const PIXEL_ID = process.env.FB_PIXEL_ID!;
const ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN!;
// Fail fast if env vars are missing
if (!PIXEL_ID || !ACCESS_TOKEN) {
  throw new Error('[Facebook CAPI] PIXEL_ID and PIXEL_ACCESS_TOKEN must be set in environment variables');
}

function sha256Hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
//testing
interface RawUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
}

export function buildUserData(raw: RawUserData) {
  const userData: Record<string, string> = {};
  if (raw.email) userData.em = sha256Hash(raw.email);
  if (raw.phone) userData.ph = sha256Hash(raw.phone);
  if (raw.firstName) userData.fn = sha256Hash(raw.firstName);
  if (raw.lastName) userData.ln = sha256Hash(raw.lastName);
  if (raw.city) userData.ct = sha256Hash(raw.city);
  if (raw.state) userData.st = sha256Hash(raw.state);
  if (raw.zip) userData.zp = sha256Hash(raw.zip);
  if (raw.country) userData.country = sha256Hash(raw.country);
  if (raw.clientIpAddress) userData.client_ip_address = raw.clientIpAddress;
  if (raw.clientUserAgent) userData.client_user_agent = raw.clientUserAgent;
  if (raw.fbp) userData.fbp = raw.fbp;
  if (raw.fbc) userData.fbc = raw.fbc;
  return userData;
}

export interface EventData {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source?: string;
  userData: ReturnType<typeof buildUserData>;
  custom_data?: Record<string, any>;
}

/**
 * Send a server-side event to Facebook Conversion API.
 */
export async function sendFacebookEvent(event: EventData) {
  const url = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_time: event.event_time,
        event_id: event.event_id,
        user_data: event.userData,
        custom_data: event.custom_data,
        event_source_url: event.event_source_url || '',
        action_source: event.action_source || 'website',
      },
    ],
  };

  const maxAttempts = 2;
  let attempt = 0;
  let lastError: any;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Facebook CAPI] Attempt ${attempt} failed:`, errorText);
        lastError = new Error(`CAPI request failed: ${errorText}`);
        continue;
      }
      const json = await res.json();
      console.log('[Facebook CAPI] Event sent successfully:', json);
      return json;
    } catch (err) {
      console.error(`[Facebook CAPI] Attempt ${attempt} error:`, err);
      lastError = err;
    }
  }
  throw lastError;
}
