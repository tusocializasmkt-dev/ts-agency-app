export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type PaymentProviderType = 'mercado_pago' | 'inter' | 'other' | 'manual';
export type PaymentEnvironment = 'sandbox' | 'production';
export type PaymentStatus = 'created' | 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'refunded';
export type PaymentAttemptStatus = 'created' | 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'failed';
export type PaymentEventProcessingStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored';
export type PaymentEventType = 'payment_created' | 'payment_pending' | 'payment_processing' | 'payment_approved' | 'payment_rejected' | 'payment_cancelled' | 'payment_expired' | 'payment_refunded' | 'duplicate_payment_detected';

export interface Payment { id: string; invoiceId: string; brandId: string; provider: PaymentProviderType; providerPaymentId?: string; method: PaymentMethod; status: PaymentStatus; amountCents: number; amount?: number; currency: 'BRL'; createdAt?: Date; updatedAt?: Date; paidAt?: Date; expiresAt?: Date; cancelledAt?: Date; failureCode?: string; failureMessage?: string; externalReference: string; idempotencyKey: string; currentAttemptId?: string; pix?: { copyPasteCode: string; qrCodeImage?: string }; cardSummary?: { brand?: string; last4?: string; installments?: number }; }
export interface PaymentAttempt { id: string; paymentId: string; invoiceId: string; brandId: string; provider: PaymentProviderType; method: PaymentMethod; status: PaymentAttemptStatus; amountCents: number; providerAttemptId?: string; idempotencyKey: string; createdAt?: Date; completedAt?: Date; failureCode?: string; failureReason?: string; }
export interface PaymentEvent { id: string; paymentId: string; invoiceId: string; provider: PaymentProviderType; providerEventId?: string; type: PaymentEventType; status?: PaymentStatus; receivedAt?: Date; processedAt?: Date; processingStatus: PaymentEventProcessingStatus; payloadReference?: string; error?: string; }
export interface PaymentProviderConfig { provider: PaymentProviderType; enabled: boolean; environment: PaymentEnvironment; supportedMethods: PaymentMethod[]; configuredAt?: Date; configuredBy: string; }
export interface CreatePaymentInput { invoiceId: string; method: PaymentMethod; idempotencyKey: string; cardToken?: string; }
export interface PaymentResult { paymentId: string; status: PaymentStatus; }
export interface PixPaymentResult extends PaymentResult { qrCode: string; qrCodeImage?: string; expiresAt: string; }
export interface CardPaymentResult extends PaymentResult { approvedAt?: string; displayMessage: string; cardSummary?: Payment['cardSummary']; }
export interface BoletoPaymentResult extends PaymentResult { barcode: string; digitableLine: string; boletoUrl: string; expiresAt: string; }
export type CheckoutState = 'idle' | 'selecting_method' | 'creating_payment' | 'awaiting_payment' | 'processing' | 'approved' | 'rejected' | 'expired' | 'error';
