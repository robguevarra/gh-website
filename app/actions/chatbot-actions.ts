'use server'

import { db } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

const COLLECTION_NAME = 'config';

export async function getBotConfig(docId: string) {
    try {
        const docRef = db.collection(COLLECTION_NAME).doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        }

        // --- Fallback to Local Files if Firestore is empty ---
        console.log(`[Config] Firestore doc '${docId}' not found. Checking local defaults...`);

        const fs = require('fs');
        const path = require('path');

        let filename = '';
        if (docId === 'bot_schedule') filename = 'schedule.json';
        if (docId === 'bot_schedule') filename = 'schedule.json';
        if (docId === 'student_faq') filename = 'faq_student.json';
        if (docId === 'bot_prompt') filename = 'prompt.json';

        if (filename) {
            // Path relative to where the user said they put it: app/api/chat-proxy/
            const localPath = path.join(process.cwd(), 'app', 'api', 'chat-proxy', filename);

            if (fs.existsSync(localPath)) {
                const content = fs.readFileSync(localPath, 'utf-8');
                let data = JSON.parse(content);

                // Consistency: Wrap lists in { items: [] } object structure
                if (Array.isArray(data)) {
                    data = { items: data };
                }

                return data;
            } else {
                console.warn(`[Config] Local fallback file not found: ${localPath}`);
            }
        }

        return null; // No Firestore, No Local File

    } catch (error) {
        console.error(`Error fetching config ${docId}:`, error);
        // Don't throw, just return null so UI handles it gracefully
        return null;
    }
}

// --- Helper to trigger V2 Bot Cache Refresh ---
async function refreshBotCache() {
    const v2Url = process.env.NEXT_PUBLIC_BOT_V2_URL;
    if (!v2Url) {
        return;
    }

    try {
        // Strip trailing slash AND trailing '/webhook' if present, to ensure clean base
        const baseUrl = v2Url.replace(/\/+$/, '').replace(/\/webhook$/, '');
        const refreshUrl = baseUrl + '/api/refresh_config';

        console.log(`🔄 Triggering Bot Cache Refresh: ${refreshUrl}`);
        // Fire and forget
        fetch(refreshUrl, { method: 'POST', cache: 'no-store' }).catch(err => console.error(err));
    } catch (error) {
        console.error("⚠️ Error triggering bot config refresh:", error);
    }
}

export async function updateBotConfig(docId: string, data: any) {
    try {
        const docRef = db.collection(COLLECTION_NAME).doc(docId);
        await docRef.set(data, { merge: true });

        // Trigger Force Refresh
        refreshBotCache();

        revalidatePath('/admin/chatbot/configuration');
        return { success: true };
    } catch (error) {
        console.error(`Error updating config ${docId}:`, error);
        return { success: false, error: 'Failed to update configuration.' };
    }
}

export async function saveFAQ(faqs: any[]) {
    // Firestore expects a map for the document, but our code reads 'items' or a list.
    // The previous python code wrapped lists in 'items' if needed. 
    // Let's stick to the structure expected by app_v2.py which handles both but prefers a list or { items: list }
    // We will save as { items: [...] } to be safe and consistent with uploaded JSONs
    return updateBotConfig('student_faq', { items: faqs });
}

// --- Reset Action ---
export async function resetBotPrompt() {
    try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), 'app', 'api', 'chat-proxy', 'prompt.json');

        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf-8');
            const data = JSON.parse(content);

            // Overwrite Firestore with local file content
            return updateBotConfig('bot_prompt', data);
        } else {
            return { success: false, error: 'Local prompt.json not found.' };
        }
    } catch (error) {
        console.error("Error resetting prompt:", error);
        return { success: false, error: 'Failed to reset prompt.' };
    }
}
