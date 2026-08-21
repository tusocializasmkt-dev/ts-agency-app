export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type PaymentStatus = 'created' | 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'refunded';
export type Money = { amountCents: number; currency: 'BRL' };
export type PaymentRecord = Money & { invoiceId: string; brandId: string; provider: 'mercado_pago'; method: PaymentMethod; status: PaymentStatus; externalReference: string; idempotencyKey: string; createdBy: string };
export type PaymentAttemptRecord = Money & { paymentId: string; invoiceId: string; brandId: string; provider: 'mercado_pago'; method: PaymentMethod; status: 'created'; idempotencyKey: string };
export type PaymentIntentResult = Money & { paymentId: string; invoiceId: string; method: PaymentMethod; status: 'created' };
export type PixPaymentData = { copyPasteCode: string; qrCodeImage?: string; expiresAt: string };
export type PixPaymentResult = Money & { paymentId: string; invoiceId: string; status: PaymentStatus; pix?: PixPaymentData; expiresAt?: string };
