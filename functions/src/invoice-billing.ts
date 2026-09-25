import { createHash } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore, type Transaction, type DocumentReference, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

type Actor = { uid: string; authTime: number };
type Invoice = { brandId: string; amount: number; dueDate: string; status: string; description?: string; paymentReportCount?: number };
export const reminderStages = [
  { days: -3, action: 'reminder_due_3_days', title: 'Sua fatura vence em 3 dias.' },
  { days: 0, action: 'reminder_due_today', title: 'Sua fatura vence hoje.' },
  { days: 1, action: 'reminder_overdue_1_day', title: 'Sua fatura está em atraso.' },
  { days: 7, action: 'reminder_overdue_7_days', title: 'Sua fatura continua pendente.' },
  { days: 9, action: 'reminder_overdue_9_days', title: 'Atenção à fatura em atraso.' },
  { days: 10, action: 'admin_overdue_10_days', title: 'Fatura em atraso há 10 dias' },
] as const;
type Stage = typeof reminderStages[number];
const open = (invoice: Invoice) => ['pending', 'overdue'].includes(invoice.status);
export function billingDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function dueDateForStage(today: string, days: number): string {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
const context = (id: string, invoice: Invoice) => `Fatura ${String(invoice.description || id).slice(0, 80)} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}. Vencimento: ${invoice.dueDate.split('-').reverse().join('/')}.`;
function invoiceData(data?: DocumentData): Invoice {
  if (!data) throw new HttpsError('not-found', 'Fatura não encontrada.');
  if (typeof data.brandId !== 'string' || !data.brandId || !Number.isFinite(data.amount) || data.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) throw new HttpsError('failed-precondition', 'Fatura inválida. Solicite revisão administrativa.');
  return data as Invoice;
}
export function invoiceIdFrom(data: unknown): string {
  const id = (data as { invoiceId?: unknown } | null)?.invoiceId;
  if (typeof id !== 'string' || !id || id.length > 200 || id.includes('/')) throw new HttpsError('invalid-argument', 'Fatura inválida.');
  return id;
}
export async function authenticatedBillingActor(auth: Auth, identity?: { uid: string; token: { auth_time?: number } }): Promise<Actor> {
  if (!identity) throw new HttpsError('unauthenticated', 'Entre novamente para continuar.');
  const user = await auth.getUser(identity.uid).catch(() => null);
  const authTime = identity.token.auth_time;
  if (!user || user.disabled || typeof authTime !== 'number' || authTime * 1000 < Date.parse(user.tokensValidAfterTime || '1970-01-01')) throw new HttpsError('unauthenticated', 'Entre novamente para continuar.');
  return { uid: identity.uid, authTime };
}
function recordEvent(db: Firestore, tx: Transaction, ref: DocumentReference, invoice: Invoice, event: string, action: string, actorUid: string, actorRole: 'admin' | 'client', recipients: string[], title: string, message: string, adminLink: boolean, extra: DocumentData = {}) {
  // One atomic commit: invoice/history/notifications. Deterministic IDs also make retries safe.
  tx.create(ref.collection('history').doc(event), { invoiceId: ref.id, brandId: invoice.brandId, action, actorUid, actorRole, createdAt: FieldValue.serverTimestamp(), ...extra });
  for (const uid of new Set(recipients)) {
    const id = createHash('sha256').update(JSON.stringify([ref.id, event, uid])).digest('hex');
    tx.create(db.collection('notifications').doc(id), { recipientUid: uid, brandId: invoice.brandId, type: action, title, message: message.slice(0, 500), link: adminLink ? '/admin/financeiro' : '/cliente/financeiro', entityType: 'invoice', entityId: ref.id, readAt: null, source: 'system', createdBy: actorUid, createdAt: FieldValue.serverTimestamp() });
  }
}
async function adminRecipients(db: Firestore, tx: Transaction): Promise<string[]> {
  const profiles = await tx.get(db.collection('admins'));
  const ids = profiles.docs.filter(doc => doc.data().active !== false).map(doc => doc.id);
  // Never silently truncate recipients or commit the status without its notifications.
  if (ids.length > 450) throw new HttpsError('resource-exhausted', 'Muitos destinatários. Solicite suporte.');
  return ids;
}
export async function reportPayment(db: Firestore, actor: Actor, id: string): Promise<{ status: string }> {
  const ref = db.collection('invoices').doc(id);
  return db.runTransaction(async tx => {
    const [snapshot, admin, team, brand] = await Promise.all([tx.get(ref), tx.get(db.collection('admins').doc(actor.uid)), tx.get(db.collection('team_members').doc(actor.uid)), tx.get(db.collection('brands').doc(actor.uid))]);
    // Check ownership before exposing any invoice detail. Profiles, not caller-supplied roles.
    if (admin.exists || team.exists || !brand.exists || brand.data()?.accessEnabled === false || snapshot.data()?.brandId !== actor.uid) throw new HttpsError('permission-denied', 'Acesso negado.');
    const invoice = invoiceData(snapshot.data());
    if (invoice.status === 'payment_reported') return { status: invoice.status };
    if (!open(invoice)) throw new HttpsError('failed-precondition', 'Esta fatura não aceita informação de pagamento.');
    const recipients = await adminRecipients(db, tx);
    if (!recipients.length) throw new HttpsError('failed-precondition', 'Nenhum administrador disponível. Fale com a agência.');
    const count = (invoice.paymentReportCount || 0) + 1;
    tx.update(ref, { status: 'payment_reported', paymentReportedAt: FieldValue.serverTimestamp(), paymentReportedBy: actor.uid, paymentReportCount: count, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    recordEvent(db, tx, ref, invoice, `payment_reported_${count}`, 'payment_reported', actor.uid, 'client', recipients, 'Pagamento informado pelo cliente', `${String(brand.data()?.name || actor.uid).slice(0, 80)}: ${context(id, invoice)} Confira o recebimento antes de confirmar.`, true, { previousStatus: invoice.status, newStatus: 'payment_reported' });
    return { status: 'payment_reported' };
  });
}
export async function confirmPayment(db: Firestore, actor: Actor, id: string): Promise<{ status: string }> {
  const ref = db.collection('invoices').doc(id);
  return db.runTransaction(async tx => {
    const admin = await tx.get(db.collection('admins').doc(actor.uid));
    if (!admin.exists || admin.data()?.active === false) throw new HttpsError('permission-denied', 'Acesso negado.');
    const invoice = invoiceData((await tx.get(ref)).data());
    if (invoice.status === 'paid') return { status: 'paid' };
    if (!open(invoice) && invoice.status !== 'payment_reported') throw new HttpsError('failed-precondition', 'Esta fatura não pode ser confirmada.');
    tx.update(ref, { status: 'paid', paidAt: FieldValue.serverTimestamp(), confirmedBy: actor.uid, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    recordEvent(db, tx, ref, invoice, 'payment_confirmed', 'payment_confirmed', actor.uid, 'admin', [invoice.brandId], 'Pagamento confirmado', context(id, invoice), false, { previousStatus: invoice.status, newStatus: 'paid' });
    return { status: 'paid' };
  });
}
export async function sendInvoiceReminder(db: Firestore, id: string, stage: Stage, today: string): Promise<boolean> {
  const ref = db.collection('invoices').doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return false;
    const invoice = invoiceData(snapshot.data());
    if (!open(invoice) || invoice.dueDate !== dueDateForStage(today, stage.days)) return false;
    const event = `${stage.action}_${invoice.dueDate}`;
    if ((await tx.get(ref.collection('history').doc(event))).exists) return false;
    const brand = await tx.get(db.collection('brands').doc(invoice.brandId));
    const recipients = stage.days === 10 ? await adminRecipients(db, tx) : [invoice.brandId];
    if (!recipients.length) throw new HttpsError('failed-precondition', 'Nenhum administrador para receber alerta.');
    let message = context(id, invoice);
    if (stage.days === 7) message += ' Regularize a pendência para evitar possíveis restrições de acesso. Qualquer restrição será avaliada pela agência.';
    if (stage.days === 9) message += ' A pendência precisa de atenção. Entre em contato com a agência para regularizar.';
    if (stage.days === 10) message = `${String(brand.data()?.name || invoice.brandId).slice(0, 80)}: ${message} Atraso: 10 dias. Avalie a situação manualmente.`;
    recordEvent(db, tx, ref, invoice, event, stage.action, 'system:invoice-reminders', 'admin', recipients, stage.title, message, stage.days === 10);
    return true;
  });
}
export async function runInvoiceReminders(db: Firestore, scheduledAt: Date): Promise<number> {
  const today = billingDate(scheduledAt);
  let sent = 0;
  for (const stage of reminderStages) {
    // Six exact due dates, only unpaid invoices; bounded pages, no full collection scan.
    const base = db.collection('invoices').where('status', 'in', ['pending', 'overdue']).where('dueDate', '==', dueDateForStage(today, stage.days)).orderBy('__name__').limit(100);
    let cursor: QueryDocumentSnapshot | undefined;
    do {
      const page = await (cursor ? base.startAfter(cursor) : base).get();
      for (const invoice of page.docs) if (await sendInvoiceReminder(db, invoice.id, stage, today)) sent++;
      cursor = page.size === 100 ? page.docs[page.size - 1] : undefined;
    } while (cursor);
  }
  return sent;
}
