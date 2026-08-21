import type { Money, PaymentStatus, PixPaymentData } from './payment.types.js';
export type ProviderApi = 'orders' | 'payments';
export type ProviderPayment = { providerPaymentId: string; providerApi: ProviderApi; status: PaymentStatus | 'unknown'; providerStatusDetail?: string; paidAt?: string; expiresAt?: string; pix?: PixPaymentData };
export type CreatePixInput = Money & { paymentId: string; invoiceId: string; description: string; payer: { email: string; firstName?: string }; externalReference: string; idempotencyKey: string };
export interface PaymentProvider {
  createPixPayment(input: CreatePixInput): Promise<ProviderPayment>;
  getPaymentStatus(providerPaymentId: string, providerApi?: ProviderApi): Promise<ProviderPayment>;
  createCardPayment(): Promise<never>;
  createBoletoPayment(): Promise<never>;
  refundPayment(): Promise<never>;
}
