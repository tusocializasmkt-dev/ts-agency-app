import type { AuthenticatedActor } from '../auth/actor.js';
import { assertInvoiceAccess } from '../auth/actor.js';
import { AppError } from '../shared/errors.js';
import { financialLog } from '../shared/logging.js';
import { invoiceAmountToCents, isPaymentMethod, isValidIdempotencyKey } from './payment.domain.js';
import type { IntentRepository } from './payment.repository.js';
import type { PaymentIntentResult } from './payment.types.js';

export class PaymentService {
  constructor(private readonly repository: IntentRepository) {}
  createIntent(actor: AuthenticatedActor, input: unknown): Promise<PaymentIntentResult> {
    if (!input || typeof input !== 'object') throw new AppError('invalid-argument', 'Dados da intenção inválidos.');
    const { invoiceId, method, idempotencyKey } = input as Record<string, unknown>;
    if (typeof invoiceId !== 'string' || !invoiceId || !isPaymentMethod(method) || !isValidIdempotencyKey(idempotencyKey)) throw new AppError('invalid-argument', 'Dados da intenção inválidos.');
    return this.repository.createIntent(actor, invoiceId, (invoice, paymentId) => {
      if (typeof invoice.brandId !== 'string') throw new AppError('failed-precondition', 'Fatura inválida.');
      assertInvoiceAccess(actor, { brandId: invoice.brandId });
      if (invoice.status === 'paid') throw new AppError('failed-precondition', 'Fatura já está paga.');
      if (invoice.status === 'cancelled') throw new AppError('failed-precondition', 'Fatura cancelada.');
      if (invoice.status === 'suspended') throw new AppError('failed-precondition', 'Fatura suspensa.');
      const amountCents = invoiceAmountToCents(invoice.amount as number);
      const common = { paymentId, invoiceId, brandId: invoice.brandId, provider: 'mercado_pago' as const, method, status: 'created' as const, amountCents, currency: 'BRL' as const, idempotencyKey };
      financialLog('payment_intent_created', { paymentId, invoiceId, uid: actor.uid, method });
      return { payment: { invoiceId, brandId: invoice.brandId, provider: 'mercado_pago', method, status: 'created', amountCents, currency: 'BRL', externalReference: `${invoiceId}/${paymentId}`, idempotencyKey, createdBy: actor.uid }, attempt: common };
    });
  }
}
