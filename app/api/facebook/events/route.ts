import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { EventData } from '@/lib/facebook-capi';
import { sendFacebookEvent } from '@/lib/facebook-capi';

export async function POST(request: NextRequest) {
  try {
    const event: EventData = await request.json();
    const response = await sendFacebookEvent(event);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error sending Facebook CAPI event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
