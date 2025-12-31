import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// URLs for the bot services
const BOT_URLS = {
    v1: process.env.NEXT_PUBLIC_BOT_V1_URL,
    v2: process.env.NEXT_PUBLIC_BOT_V2_URL
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { version, message, user_id } = body;

        if (!version || !message) {
            return NextResponse.json(
                { error: 'Missing version or message' },
                { status: 400 }
            );
        }

        const targetUrl = BOT_URLS[version as keyof typeof BOT_URLS];

        if (!targetUrl) {
            return NextResponse.json(
                { error: 'Invalid bot version' },
                { status: 400 }
            );
        }

        // Prepare payload for the Python Bot
        const payload = {
            user_id: user_id || 'test_user_admin_panel',
            message: message
        };

        const startTime = Date.now();

        // Forward request to Python Service
        const response = await axios.post(targetUrl, payload, {
            timeout: 60000 // 60s timeout
        });

        const endTime = Date.now();
        const latency = endTime - startTime;

        return NextResponse.json({
            ...response.data,
            latency: latency
        });

    } catch (error: any) {
        console.error('Proxy Error:', error.message);

        const status = error.response ? error.response.status : 500;
        const errorMessage = error.response?.data?.error || error.message;

        return NextResponse.json(
            { error: errorMessage },
            { status: status }
        );
    }
}
