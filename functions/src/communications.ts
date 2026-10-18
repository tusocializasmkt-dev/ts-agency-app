import { createHash } from 'node:crypto';
import { FieldValue, FieldPath, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export interface CommunicationInput { id: string; title: string; message: string; image: string; popup: boolean; audience: 'all' | 'selected'; recipients: string[]; action: 'draft' | 'send' | 'schedule'; scheduledAt: number | null; revision: number }
export const activeRecipient = (data: Record<string, unknown>) => data.status === 'active' && data.accessEnabled !== false;
export function validateCommunication(raw: unknown): CommunicationInput {
  const d = raw as CommunicationInput;
  if (!d || typeof d.id !== 'string' || !/^[\w-]{1,100}$/.test(d.id) || !Number.isInteger(d.revision) || d.revision < 0 || typeof d.title !== 'string' || !d.title.trim() || d.title.length > 120 || typeof d.message !== 'string' || !d.message.trim() || d.message.length > 4000 || typeof d.popup !== 'boolean' || !['all', 'selected'].includes(d.audience) || !['draft', 'send', 'schedule'].includes(d.action) || !Array.isArray(d.recipients) || d.recipients.length > 500 || d.recipients.some(id => typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) || (d.audience === 'selected' && !d.recipients.length) || typeof d.image !== 'string' || (d.image !== '' && !/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/gen-lang-client-0975642231\.firebasestorage\.app\/o\/agency%2Fcommunications%2F[\w.-]+\?alt=media(?:&token=[\w-]+)?$/.test(d.image))) throw new HttpsError('invalid-argument', 'Preencha título, mensagem e destinatários válidos.');
  if (d.action === 'schedule' && (!Number.isFinite(d.scheduledAt) || d.scheduledAt! <= Date.now() || d.scheduledAt! > Date.now() + 366 * 86400000)) throw new HttpsError('invalid-argument', 'Selecione uma data futura, em até um ano.');
  return { ...d, title: d.title.trim(), message: d.message.trim(), recipients: d.audience === 'all' ? [] : [...new Set(d.recipients)].sort() };
}
export async function assertEditor(db: Firestore, uid: string | undefined, claims: Record<string, unknown> | undefined, permission = 'communicationsEditor') {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre novamente.');
  const profile = await db.collection('admins').doc(uid).get();
  if (!profile.exists || profile.data()?.active === false || claims?.admin !== true || claims?.[permission] !== true) throw new HttpsError('permission-denied', 'Permissão administrativa necessária.');
}
export const deliveryId = (communicationId: string, recipient: string) => 'communication_' + createHash('sha256').update(JSON.stringify([communicationId, recipient])).digest('hex');
export async function manageCommunication(db: Firestore, uid: string, raw: unknown) {
  const d = validateCommunication(raw);
  const reference = db.collection('communications').doc(d.id);
  const fingerprint = createHash('sha256').update(JSON.stringify(d)).digest('hex');
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(reference); const previous = snapshot.data();
    if (previous?.fingerprint === fingerprint) return { id: d.id, status: previous.status, revision: previous.revision };
    if (previous && (!['draft', 'scheduled'].includes(previous.status) || previous.revision !== d.revision)) throw new HttpsError('failed-precondition', 'O comunicado mudou ou já entrou em envio. Atualize a lista.');
    if (!previous && d.revision !== 0) throw new HttpsError('failed-precondition', 'Rascunho inexistente.');
    const status = d.action === 'send' ? 'queued' : d.action === 'schedule' ? 'scheduled' : 'draft';
    const revision = d.revision + 1;
    tx.set(reference, { ...d, revision, status, fingerprint, scheduledAt: Timestamp.fromMillis(d.action === 'schedule' ? d.scheduledAt! : Date.now()), updatedAt: FieldValue.serverTimestamp(), createdAt: previous?.createdAt || FieldValue.serverTimestamp(), createdBy: previous?.createdBy || uid, updatedBy: uid, cursor: '', offset: 0, delivered: 0 });
    return { id: d.id, status, revision };
  });
}

// Each page and its progress commit together. Overlapping scheduler retries cannot
// create duplicate deliveries or reset a recipient's read/dismiss state.
export async function deliverPage(db: Firestore, id: string): Promise<boolean> {
  return db.runTransaction(async tx => {
    const reference = db.collection('communications').doc(id);
    const snapshot = await tx.get(reference); const job = snapshot.data();
    if (!job || !['queued', 'scheduled', 'sending'].includes(job.status) || job.scheduledAt.toMillis() > Date.now()) return false;
    let recipients: FirebaseFirestore.QueryDocumentSnapshot[] | FirebaseFirestore.DocumentSnapshot[];
    let cursor = job.cursor; let offset = job.offset;
    let done: boolean;
    if (job.audience === 'all') {
      let q = db.collection('brands').orderBy(FieldPath.documentId()).limit(100);
      if (cursor) q = q.startAfter(cursor);
      const page = await tx.get(q); recipients = page.docs;
      cursor = page.docs.at(-1)?.id || cursor; done = page.size < 100;
    } else {
      const ids = (job.recipients as string[]).slice(offset, offset + 100);
      recipients = ids.length ? await tx.getAll(...ids.map(uid => db.collection('brands').doc(uid))) : [];
      offset += ids.length; done = offset >= job.recipients.length;
    }
    const active = recipients.filter(d => d.exists && activeRecipient(d.data()!));
    const refs = active.map(d => db.collection('notifications').doc(deliveryId(id, d.id)));
    const existing = refs.length ? await tx.getAll(...refs) : [];
    let delivered = 0;
    for (let i = 0; i < active.length; i++) {
      if (existing[i].exists) continue;
      tx.create(refs[i], { recipientUid: active[i].id, brandId: active[i].id, type: 'communication', title: job.title, message: job.message, imageUrl: job.image, popup: job.popup, popupDismissedAt: null, communicationId: id, source: 'admin', createdBy: job.createdBy, createdAt: FieldValue.serverTimestamp(), readAt: null });
      delivered++;
    }
    tx.update(reference, { cursor, offset, delivered: (job.delivered || 0) + delivered, status: done ? 'sent' : 'sending', updatedAt: FieldValue.serverTimestamp(), ...(done ? { sentAt: FieldValue.serverTimestamp() } : {}) });
    return !done;
  });
}
export async function dispatchCommunications(db: Firestore) {
  // Status/due-time index keeps future schedules out of each polling page.
  const jobs = await db.collection('communications').where('status', 'in', ['sending', 'queued', 'scheduled']).orderBy('scheduledAt').where('scheduledAt', '<=', Timestamp.now()).limit(10).get();
  for (const job of jobs.docs) {
    for (let page = 0; page < 5; page++) if (!await deliverPage(db, job.id)) break;
  }
}
