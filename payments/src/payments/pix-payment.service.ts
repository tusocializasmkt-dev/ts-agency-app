import type { Firestore } from 'firebase-admin/firestore';
import type { AuthenticatedActor } from '../auth/actor.js';
import { requireClient } from '../auth/actor.js';
import { AppError } from '../shared/errors.js';
import { financialLog } from '../shared/logging.js';
import type { PaymentProvider } from './payment-provider.js';
import type { PixRepository } from './payment.repository.js';
import { PaymentService } from './payment.service.js';
import type { PixPaymentResult } from './payment.types.js';
import { ProviderError } from './provider-error.js';

export class PixPaymentService {
  private readonly intents: PaymentService;
  constructor(private readonly db: Firestore, private readonly repository: PixRepository, private readonly provider: PaymentProvider) { this.intents = new PaymentService(repository); }
  async create(actor: AuthenticatedActor, input: unknown): Promise<PixPaymentResult> {
    requireClient(actor); if (!input || typeof input !== 'object') throw new AppError('invalid-argument', 'Dados Pix inválidos.'); const { invoiceId, idempotencyKey } = input as Record<string, unknown>;
    const intent = await this.intents.createIntent(actor, { invoiceId, method: 'pix', idempotencyKey }); const stored = await this.repository.getPayment(intent.paymentId);
    if ((stored.status === 'pending' || stored.status === 'processing') && stored.expiresAt) { const expiresAt = typeof stored.expiresAt === 'object' && 'toDate' in stored.expiresAt ? stored.expiresAt.toDate().toISOString() : stored.expiresAt instanceof Date ? stored.expiresAt.toISOString() : String(stored.expiresAt); if (Date.parse(expiresAt) > Date.now()) return { ...intent, status: stored.status, ...(stored.pix?.copyPasteCode ? { pix: { copyPasteCode: stored.pix.copyPasteCode, qrCodeImage: stored.pix.qrCodeImage, expiresAt } } : {}), expiresAt }; throw new AppError('failed-precondition', 'Este Pix expirou. Gere uma nova tentativa.'); }
    if (stored.status !== 'created') throw new AppError('failed-precondition', 'Pagamento não está disponível para criação Pix.');
    const brand = await this.db.doc(`brands/${actor.brandId}`).get(); const brandData = brand.data(); const email = typeof brandData?.email === 'string' ? brandData.email : typeof brandData?.login === 'string' && brandData.login.includes('@') ? brandData.login : undefined; if (!email) throw new AppError('failed-precondition', 'Cliente sem e-mail válido para pagamento Pix.');
    const invoice = await this.db.doc(`invoices/${intent.invoiceId}`).get(); const description = typeof invoice.data()?.description === 'string' ? invoice.data()!.description : `Fatura ${intent.invoiceId}`;
    try { const providerResult = await this.provider.createPixPayment({ paymentId: intent.paymentId, invoiceId: intent.invoiceId, amountCents: intent.amountCents, currency: 'BRL', description, payer: { email, firstName: typeof brandData?.responsible === 'string' ? brandData.responsible.split(/\s+/)[0] : undefined }, externalReference: `${intent.invoiceId}/${intent.paymentId}`, idempotencyKey: String(idempotencyKey) }); financialLog('pix_created', { correlationId: intent.paymentId, paymentId: intent.paymentId, invoiceId: intent.invoiceId, providerPaymentId: providerResult.providerPaymentId.slice(-6), status: providerResult.status }); return this.repository.saveCreatedPix(intent.paymentId, providerResult); }
    catch (error) { await this.repository.markProviderOutcomeUncertain(intent.paymentId, error instanceof ProviderError ? error.diagnostics : undefined); financialLog('pix_provider_outcome_uncertain', { correlationId: intent.paymentId, paymentId: intent.paymentId, invoiceId: intent.invoiceId }); throw error; }
  }
}
