import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { checkoutInvoiceId, checkoutInvoiceVersion, invoiceAmountCents, type CheckoutInvoice } from './invoice-checkout-domain.js';
import { billingDate } from './invoice-billing.js';

type Command = { action: 'edit' | 'delete' | 'edit_series' | 'delete_series' | 'delete_before' | 'inspect' | 'transition'; invoiceId: string; changes?: Record<string, unknown>; before?: string; endDate?: string; day?: number; status?: string };
const fail = (message: string): never => { throw new HttpsError('failed-precondition', message); };
const date = (value: unknown): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new HttpsError('invalid-argument', 'Data inválida.');
  return value;
};
const cleanChanges = (input: unknown) => {
  const result: Record<string, unknown> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  const allowed = ['amount', 'dueDate', 'description', 'notes', 'referenceMonth', 'pixKey', 'pixKeyType', 'boletoUrl', 'boletoMediaId'];
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key)) throw new HttpsError('invalid-argument', 'Campo não permitido.');
    if (key === 'amount') { invoiceAmountCents(value as number); result[key] = value; }
    else if (key === 'dueDate') result[key] = date(value);
    else {
      if (typeof value !== 'string' || value.length > 2000) throw new HttpsError('invalid-argument', 'Texto inválido.');
      const text = value.trim();
      if (key === 'description' && !text) throw new HttpsError('invalid-argument', 'Informe a descrição.');
      if (key === 'referenceMonth' && text) date(`${text}-01`);
      if (key === 'pixKeyType' && text && !['cpf', 'cnpj', 'email', 'phone', 'random'].includes(text)) throw new HttpsError('invalid-argument', 'Tipo Pix inválido.');
      if (key === 'boletoUrl' && text) { let url; try { url = new URL(text); } catch { throw new HttpsError('invalid-argument', 'URL inválida.'); } if (!['https:', 'http:'].includes(url.protocol)) throw new HttpsError('invalid-argument', 'URL inválida.'); }
      if (key === 'boletoMediaId' && !/^[A-Za-z0-9_-]{1,128}$/.test(text)) throw new HttpsError('invalid-argument', 'Boleto inválido.');
      result[key] = text;
    }
  }
  return result;
};
function commandFrom(data: any): Command {
  const invoiceId = checkoutInvoiceId(data);
  if (!['edit', 'delete', 'edit_series', 'delete_series', 'delete_before', 'inspect', 'transition'].includes(data?.action)) throw new HttpsError('invalid-argument', 'Operação inválida.');
  const command: Command = { action: data.action, invoiceId, changes: cleanChanges(data.changes) };
  if (data.before !== undefined) command.before = date(data.before);
  if (data.endDate !== undefined) command.endDate = date(data.endDate);
  if (data.day !== undefined) { if (!Number.isInteger(data.day) || data.day < 1 || data.day > 31) throw new HttpsError('invalid-argument', 'Dia deve estar entre 1 e 31.'); command.day = data.day; }
  if (data.status !== undefined) command.status = String(data.status);
  if (command.action === 'delete_before' && !command.before) throw new HttpsError('invalid-argument', 'Informe a data limite.');
  if (command.action === 'edit_series' && Object.keys(command.changes!).some(key => !['amount', 'description', 'notes'].includes(key))) throw new HttpsError('invalid-argument', 'Campo não permitido na série.');
  if (!['edit', 'edit_series'].includes(command.action) && Object.keys(command.changes!).length) throw new HttpsError('invalid-argument', 'Esta operação não aceita edição de campos.');
  if (command.action !== 'edit_series' && (command.day !== undefined || command.endDate !== undefined)) throw new HttpsError('invalid-argument', 'Ajuste de período exige edição de recorrência.');
  return command;
}
interface Loaded { snapshot: QueryDocumentSnapshot | DocumentSnapshot; history: QueryDocumentSnapshot[]; notifications: QueryDocumentSnapshot[]; external: boolean; evidence: string[] }
const identity = (snapshot: DocumentSnapshot) => `${snapshot.ref.path}:${snapshot.updateTime?.seconds || 0}:${snapshot.updateTime?.nanoseconds || 0}`;
async function load(db: Firestore, tx: Transaction, snapshot: DocumentSnapshot): Promise<Loaded> {
  const id = snapshot.id;
  const [history, notifications, payment, lock] = await Promise.all([
    tx.get(snapshot.ref.collection('history').limit(61)), tx.get(db.collection('notifications').where('entityId', '==', id).limit(61)),
    tx.get(db.collection('payments').where('invoiceId', '==', id).limit(1)), tx.get(db.doc(`invoice_checkout_locks/${id}`)),
  ]);
  return { snapshot, history: history.docs, notifications: notifications.docs, external: !payment.empty || lock.exists,
    evidence: [identity(snapshot), ...history.docs.map(identity), ...notifications.docs.map(identity), ...payment.docs.map(identity), identity(lock)].sort() };
}
function protectedReason(item: Loaded, deleting: boolean): string | null {
  const invoice = item.snapshot.data()!;
  if (invoice.status === 'paid' || invoice.paidAt || invoice.confirmedBy || invoice.settlementPaymentId) return 'Pagamento confirmado: preserve a fatura e seu histórico.';
  if (invoice.status === 'payment_reported' || invoice.paymentReportedAt || invoice.paymentPromise) return 'Pagamento informado ou promessa registrada: exige conferência individual.';
  if (item.external) return 'Existe checkout ou tentativa externa. Reconcilie antes de qualquer ajuste financeiro.';
  if (!deleting && !['pending', 'overdue'].includes(invoice.status)) return 'Fatura encerrada ou suspensa: apenas a observação pode ser corrigida.';
  if (item.history.length > 60 || item.notifications.length > 60) return 'Histórico extenso: solicite revisão individual.';
  if (deleting && (invoice.boletoMediaId || invoice.boletoUrl)) return 'Existe boleto associado: preserve a cobrança ou cancele.';
  if (item.history.some(doc => !['created', ...(deleting ? [] : ['edited', 'amount_changed', 'due_date_changed', 'series_edited', 'series_shortened'])].includes(doc.data().action))) return 'Existe histórico financeiro que deve ser preservado.';
  if (deleting && item.notifications.some(doc => doc.data().type !== 'invoice_created')) return 'Existem notificações financeiras relacionadas.';
  return null;
}
export async function manageInvoices(db: Firestore, uid: string, input: any, now = new Date()) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre novamente.');
  const phase = input?.phase;
  if (!['apply', 'preview', 'confirm', 'inspect'].includes(phase)) throw new HttpsError('invalid-argument', 'Etapa inválida.');
  const operation = db.collection('invoice_management_operations').doc();
  return db.runTransaction(async tx => {
    const admin = await tx.get(db.doc(`admins/${uid}`));
    if (!admin.exists || admin.data()?.active === false) throw new HttpsError('permission-denied', 'Somente Admin pode gerenciar faturas.');
    let command: Command; let preview: DocumentSnapshot | undefined;
    if (phase === 'confirm') {
      if (typeof input.previewId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.previewId)) throw new HttpsError('invalid-argument', 'Prévia inválida.');
      preview = await tx.get(db.doc(`invoice_management_operations/${input.previewId}`));
      const stored = preview.data();
      if (!stored || stored.uid !== uid) throw new HttpsError('permission-denied', 'Prévia não disponível.');
      if (stored.status === 'confirmed') return stored.result;
      if (Date.parse(stored.expiresAt) < now.getTime()) fail('A prévia expirou. Gere uma nova.');
      command = commandFrom(stored.command);
    } else command = commandFrom(input);
    if (phase === 'apply' && !['edit', 'transition'].includes(command.action)) fail('Esta operação exige prévia e confirmação.');
    const anchor = await tx.get(db.doc(`invoices/${command.invoiceId}`));
    if (!anchor.exists) throw new HttpsError('not-found', 'Fatura não encontrada.');
    const base = anchor.data()!;
    const seriesAction = ['edit_series', 'delete_series', 'delete_before', 'inspect'].includes(command.action);
    let snapshots: DocumentSnapshot[] = [anchor];
    if (seriesAction) {
      if (!base.recurrenceGroupId || typeof base.recurrenceGroupId !== 'string') fail('Esta fatura não pertence a uma recorrência.');
      const series = await tx.get(db.collection('invoices').where('recurrenceGroupId', '==', base.recurrenceGroupId).limit(61));
      if (series.size > 60) fail('A série ultrapassa 60 parcelas. Nenhuma alteração foi aplicada; solicite revisão especializada.');
      snapshots = series.docs.sort((a, b) => Date.parse(a.data().dueDate) - Date.parse(b.data().dueDate));
      if (snapshots.some(doc => doc.data()!.brandId !== base.brandId)) fail('A série contém clientes divergentes. Solicite revisão.');
    }
    const loaded = await Promise.all(snapshots.map(snapshot => load(db, tx, snapshot)));
    const month = billingDate(now).slice(0, 7);
    const summary = { description: base.description || '', amount: base.amount, first: snapshots[0].data()!.dueDate, last: snapshots[snapshots.length - 1].data()!.dueDate, total: snapshots.length,
      paid: snapshots.filter(s => s.data()!.status === 'paid').length, open: snapshots.filter(s => ['pending', 'overdue', 'payment_reported'].includes(s.data()!.status) && s.data()!.dueDate.slice(0, 7) <= month).length,
      future: snapshots.filter(s => ['pending', 'overdue', 'payment_reported'].includes(s.data()!.status) && s.data()!.dueDate.slice(0, 7) > month).length };
    if (phase === 'inspect' && command.action === 'inspect') return { summary };
    if (command.endDate && command.endDate > summary.last) fail('Esta operação permite somente encurtar a série.');
    if (command.endDate && command.endDate < base.dueDate) fail('O término não pode anteceder a parcela escolhida.');
    const edits: { item: Loaded; changes: Record<string, unknown> }[] = []; const removals: Loaded[] = []; const protectedInvoices: { id: string; dueDate: string; reason: string }[] = [];
    for (const item of loaded) {
      const current = item.snapshot.data()!;
      const selected = command.action === 'delete_before' ? current.dueDate < command.before! : seriesAction ? current.dueDate >= base.dueDate : true;
      if (!selected) continue;
      const changes = { ...command.changes };
      if (command.action === 'edit_series') {
        if (command.day) {
          const [year, m] = current.dueDate.split('-').map(Number);
          changes.dueDate = `${year}-${String(m).padStart(2, '0')}-${String(Math.min(command.day, new Date(Date.UTC(year, m, 0)).getUTCDate())).padStart(2, '0')}`;
          changes.recurrenceDay = command.day;
        }
        if (command.endDate) changes.recurrenceEnd = command.endDate.slice(0, 7);
      }
      const effectiveDueDate = String(changes.dueDate || current.dueDate);
      const deleting = ['delete', 'delete_series', 'delete_before'].includes(command.action) || (command.action === 'edit_series' && !!command.endDate && effectiveDueDate > command.endDate);
      let reason = protectedReason(item, deleting);
      if (deleting && command.action === 'edit_series' && current.dueDate <= billingDate(now)) reason = 'Encurtamento remove apenas parcelas futuras. Use Gerenciar recorrência para corrigir parcelas antigas.';
      for (const key of Object.keys(changes)) if ((current[key] ?? '') === changes[key]) delete changes[key];
      // Notes alone may be corrected individually without changing financial evidence.
      if (command.action === 'edit' && Object.keys(changes).every(key => key === 'notes')) reason = null;
      if (command.action === 'transition') {
        const allowed: Record<string, string[]> = { pending: ['suspended', 'cancelled'], overdue: ['suspended', 'cancelled'], payment_reported: ['suspended', 'cancelled'], suspended: ['pending', 'cancelled'] };
        if (!(allowed[current.status] || []).includes(command.status || '')) reason = 'Transição não permitida.';
        // Cancellation preserves evidence. It does not void an external checkout, so those remain blocked.
        else reason = item.external || current.paidAt ? 'Checkout ou pagamento associado: reconcilie antes de cancelar/suspender.' : null;
        changes.status = command.status;
        if (command.status === 'cancelled') changes.cancelledAt = FieldValue.serverTimestamp();
        if (command.status === 'suspended') changes.suspendedAt = FieldValue.serverTimestamp();
        if (command.status === 'pending') changes.suspendedAt = FieldValue.delete();
      }
      if (reason) { protectedInvoices.push({ id: item.snapshot.id, dueDate: current.dueDate, reason }); continue; }
      if (deleting) removals.push(item); else if (Object.keys(changes).length) edits.push({ item, changes });
    }
    if (phase === 'apply' && protectedInvoices.length) fail(protectedInvoices[0].reason);
    // Validate media association before any write.
    for (const edit of edits) if (edit.changes.boletoMediaId) {
      const media = await tx.get(db.doc(`media/${edit.changes.boletoMediaId}`));
      if (!media.exists || media.data()!.brandId !== base.brandId || media.data()!.category !== 'invoice') fail('Boleto não pertence a este cliente.');
    }
    const result = { summary, updated: edits.length, removed: removals.length, preserved: loaded.length - edits.length - removals.length, protected: protectedInvoices.length, protectedInvoices };
    const digest = createHash('sha256').update(JSON.stringify({ command, evidence: loaded.flatMap(item => item.evidence), result })).digest('hex');
    const writes = edits.length * 2 + removals.reduce((sum, item) => sum + 1 + item.history.length + item.notifications.length, 0) + 1;
    if (writes > 450) fail('A operação ultrapassa o limite seguro. Nenhuma alteração foi aplicada. Selecione um período menor para gerar a prévia.');
    if (phase === 'preview') {
      tx.create(operation, { uid, command, digest, status: 'preview', expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(), result, createdAt: FieldValue.serverTimestamp() });
      return { ...result, previewId: operation.id };
    }
    if (phase !== 'apply' && phase !== 'confirm') fail('Etapa incompatível.');
    if (preview && preview.data()!.digest !== digest) fail('As faturas ou associações mudaram. Gere uma nova prévia antes de confirmar.');
    const audit = preview?.ref || operation;
    for (const { item, changes } of edits) {
      const current = item.snapshot.data()!;
      const next = { ...current, ...changes } as CheckoutInvoice;
      const action = command.action === 'transition' ? ({ pending: 'resumed', cancelled: 'cancelled', suspended: 'suspended' }[command.status!] || 'edited') : command.action === 'edit_series' ? command.endDate ? 'series_shortened' : 'series_edited' : changes.amount !== undefined ? 'amount_changed' : changes.dueDate ? 'due_date_changed' : 'edited';
      tx.update(item.snapshot.ref, { ...changes, invoiceVersion: checkoutInvoiceVersion(next), updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
      tx.create(item.snapshot.ref.collection('history').doc(audit.id), { invoiceId: item.snapshot.id, brandId: base.brandId, action, actorUid: uid, actorRole: 'admin', previousAmount: current.amount, newAmount: next.amount, previousDueDate: current.dueDate, newDueDate: next.dueDate, previousStatus: current.status, newStatus: next.status, changedFields: Object.keys(changes), operationId: audit.id, createdAt: FieldValue.serverTimestamp() });
    }
    for (const item of removals) { for (const child of [...item.history, ...item.notifications]) tx.delete(child.ref); tx.delete(item.snapshot.ref); }
    tx.set(audit, { uid, command, status: 'confirmed', result, removedIds: removals.map(item => item.snapshot.id), updatedIds: edits.map(item => item.item.snapshot.id), confirmedAt: FieldValue.serverTimestamp() }, { merge: true });
    return result;
  });
}
