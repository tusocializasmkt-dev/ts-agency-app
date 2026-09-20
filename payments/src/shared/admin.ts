import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const adminApp = getApps()[0] ?? initializeApp();
export const adminDb = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58');
