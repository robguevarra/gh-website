import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function getServiceAccount() {
    // 1. Try Environment Variable
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // If it's a JSON string (not a path), parse it
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{')) {
            try {
                return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
            } catch (e) {
                console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS JSON");
            }
        }
        // Otherwise assume it's a path or let cert handle it if it works, 
        // but cert(string) expects a path. Validating path existence might be good.
        return process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    // 2. Try Local File (Fallback)
    const localPath = path.join(process.cwd(), 'manychat-service-account.json');
    if (fs.existsSync(localPath)) {
        try {
            const fileContent = fs.readFileSync(localPath, 'utf-8');
            return JSON.parse(fileContent);
        } catch (e) {
            console.error("Failed to read local service account file:", e);
        }
    }

    return undefined;
}

const serviceAccount = getServiceAccount();

if (!serviceAccount) {
    if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS is not set and local file not found. Firestore features will fail.');
    }
}

// Singleton initialization
const firebaseApp = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
        projectId: 'manychat-openai-integration'
    })
    : getApps()[0];

export const db = getFirestore(firebaseApp);
