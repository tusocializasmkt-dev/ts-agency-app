import { FieldValue, type Firestore } from 'firebase-admin/firestore';

type SystemNotification = { recipientUid: string; brandId: string; type: 'payment_promise_requested' | 'payment_confirmed'; title: string; message: string; link: string; entityType: 'invoice'; entityId: string };
export async function createSystemNotification(db: Firestore, input: SystemNotification) { if (!input.recipientUid || !input.entityId || !input.link.startsWith('/')) throw new Error('invalid-notification'); return db.collection('notifications').add({ ...input, source: 'system', readAt: null, createdAt: FieldValue.serverTimestamp() }); }
export async function notifyAdmins(db: Firestore, input: Omit<SystemNotification, 'recipientUid'>) { const admins = await db.collection('admins').get(); await Promise.all(admins.docs.map(item => createSystemNotification(db, { ...input, recipientUid: item.id }))); }
