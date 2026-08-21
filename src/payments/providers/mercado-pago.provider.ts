import type { PaymentProvider, ParsedPaymentWebhook } from '../payment-provider.interface';
import type { BoletoPaymentResult, CardPaymentResult, CreatePaymentInput, PaymentResult, PixPaymentResult } from '../payment.types';
import { PaymentError } from '../payment.errors';
export class MercadoPagoProvider implements PaymentProvider {
  private unavailable<T>(): Promise<T> { return Promise.reject(new PaymentError('payment-provider-not-configured')); }
  createPixPayment(_input: CreatePaymentInput): Promise<PixPaymentResult> { return this.unavailable(); }
  createCardPayment(_input: CreatePaymentInput): Promise<CardPaymentResult> { return this.unavailable(); }
  createBoletoPayment(_input: CreatePaymentInput): Promise<BoletoPaymentResult> { return this.unavailable(); }
  getPaymentStatus(_id: string): Promise<PaymentResult> { return this.unavailable(); }
  cancelPayment(_id: string): Promise<PaymentResult> { return this.unavailable(); }
  refundPayment(_id: string): Promise<PaymentResult> { return this.unavailable(); }
  parseWebhook(_payload: unknown): Promise<ParsedPaymentWebhook> { return this.unavailable(); }
  verifyWebhook(_payload: unknown, _signature?: string): Promise<boolean> { return this.unavailable(); }
}
