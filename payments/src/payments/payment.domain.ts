import { AppError } from '../shared/errors.js';
import type { PaymentMethod, PaymentStatus } from './payment.types.js';

export function invoiceAmountToCents(amount: number): number { if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > Number.EPSILON * 100) throw new AppError('invalid-argument', 'Valor da fatura inválido.'); return Math.round(amount * 100); }
export const isPaymentMethod = (value: unknown): value is PaymentMethod => value === 'pix' || value === 'credit_card' || value === 'boleto';
export const isValidIdempotencyKey = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{15,127}$/.test(value);
export const PIX_ATTEMPT_LIMIT_PER_HOUR = 5;
export function assertPixCapacity(hasActivePix: boolean, attemptsInWindow: number) { if (hasActivePix) throw new AppError('resource-exhausted', 'Já existe um Pix ativo para esta fatura.'); if (attemptsInWindow >= PIX_ATTEMPT_LIMIT_PER_HOUR) throw new AppError('resource-exhausted', 'Limite temporário de tentativas Pix atingido.'); }
const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = { created: ['pending', 'processing', 'cancelled'], pending: ['processing', 'approved', 'rejected', 'expired', 'cancelled'], processing: ['pending', 'approved', 'rejected', 'expired', 'cancelled'], approved: ['refunded'], rejected: [], cancelled: [], expired: [], refunded: [] };
export function providerTransitionDecision(current: PaymentStatus, next: PaymentStatus | 'unknown'): 'apply' | 'noop' | 'ignore' { if (next === 'unknown') return 'ignore'; if (current === next) return 'noop'; return transitions[current].includes(next) ? 'apply' : 'ignore'; }
export function assertPaymentTransition(current: PaymentStatus, next: PaymentStatus) { if (!transitions[current].includes(next)) throw new AppError('failed-precondition', 'Transição de pagamento inválida.'); }
export function approvedPaymentDecision(invoice: { status: string; activePaymentId?: string }, paymentId: string): 'settle' | 'already-settled' | 'duplicate-review' { if (invoice.status === 'paid' && invoice.activePaymentId === paymentId) return 'already-settled'; return invoice.status === 'paid' || Boolean(invoice.activePaymentId && invoice.activePaymentId !== paymentId) ? 'duplicate-review' : 'settle'; }
