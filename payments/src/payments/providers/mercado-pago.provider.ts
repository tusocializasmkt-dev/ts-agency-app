import { MercadoPagoConfig, Order, Payment } from 'mercadopago';
import { AppError } from '../../shared/errors.js';
import { financialError } from '../../shared/logging.js';
import { requireSandboxToken } from '../../config/payment-config.js';
import type { CreatePixInput, PaymentProvider, ProviderApi, ProviderPayment } from '../payment-provider.js';
import type { PaymentStatus } from '../payment.types.js';
import { normalizeProviderError, ProviderError } from '../provider-error.js';

type LegacyPayment = Awaited<ReturnType<Payment['get']>>;
type OrderResponse = Awaited<ReturnType<Order['get']>>;

export const toMercadoPagoExternalReference = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);

export const mapMercadoPagoStatus = (status?: string, detail?: string): PaymentStatus | 'unknown' => {
  if ((status === 'processed' && detail === 'accredited') || status === 'approved') return 'approved';
  if (status === 'action_required' || status === 'pending') return 'pending';
  if (status === 'processing' || status === 'in_process' || status === 'authorized') return 'processing';
  if (status === 'created') return 'created';
  if (status === 'failed' || status === 'rejected') return 'rejected';
  if (status === 'canceled' || status === 'cancelled') return detail === 'expired' ? 'expired' : 'cancelled';
  if (status === 'expired') return 'expired';
  if (status === 'refunded' || status === 'charged_back') return 'refunded';
  return 'unknown';
};

const mapOrder = (order: OrderResponse, fallbackExpiration?: string): ProviderPayment => {
  if (!order.id) throw new AppError('internal', 'Resposta inesperada do provedor de pagamento.');
  const transaction = order.transactions?.payments?.[0];
  const status = mapMercadoPagoStatus(transaction?.status ?? order.status, transaction?.status_detail ?? order.status_detail);
  const method = transaction?.payment_method;
  const expiresAt = transaction?.date_of_expiration ?? (transaction?.expiration_time?.includes('T') ? transaction.expiration_time : undefined) ?? fallbackExpiration;
  const copyPasteCode = method?.qr_code;
  return {
    providerPaymentId: order.id,
    providerApi: 'orders',
    status,
    providerStatusDetail: transaction?.status_detail ?? order.status_detail,
    expiresAt,
    pix: copyPasteCode && expiresAt ? { copyPasteCode, qrCodeImage: method?.qr_code_base64, expiresAt } : undefined,
  };
};

const mapLegacyPayment = (response: LegacyPayment): ProviderPayment => {
  if (response.id == null) throw new AppError('internal', 'Resposta inesperada do provedor de pagamento.');
  const transaction = response.point_of_interaction?.transaction_data;
  const expiresAt = response.date_of_expiration ?? undefined;
  return {
    providerPaymentId: String(response.id),
    providerApi: 'payments',
    status: mapMercadoPagoStatus(response.status, response.status_detail),
    providerStatusDetail: response.status_detail ?? undefined,
    paidAt: response.date_approved ?? undefined,
    expiresAt,
    pix: transaction?.qr_code && expiresAt ? { copyPasteCode: transaction.qr_code, qrCodeImage: transaction.qr_code_base64 || undefined, expiresAt } : undefined,
  };
};

export class MercadoPagoProvider implements PaymentProvider {
  private readonly order: Order;
  private readonly legacyPayment?: Payment;

  constructor(ordersToken: string, legacyPaymentsToken?: string, timeoutMs = 8_000, environment = process.env.PAYMENT_ENVIRONMENT) {
    this.order = new Order(new MercadoPagoConfig({ accessToken: requireSandboxToken(ordersToken, environment), options: { timeout: timeoutMs } }));
    if (legacyPaymentsToken?.trim()) this.legacyPayment = new Payment(new MercadoPagoConfig({ accessToken: requireSandboxToken(legacyPaymentsToken, environment), options: { timeout: timeoutMs } }));
  }

  async createPixPayment(input: CreatePixInput): Promise<ProviderPayment> {
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    try {
      const response = await this.order.create({
        body: {
          type: 'online',
          processing_mode: 'automatic',
          total_amount: (input.amountCents / 100).toFixed(2),
          external_reference: toMercadoPagoExternalReference(input.externalReference),
          description: input.description.slice(0, 120),
          transactions: { payments: [{ amount: (input.amountCents / 100).toFixed(2), payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
          payer: { email: input.payer.email, first_name: input.payer.firstName },
        },
        requestOptions: { idempotencyKey: input.idempotencyKey },
      });
      const mapped = mapOrder(response, expiresAt);
      if (mapped.status === 'unknown') throw new AppError('internal', 'Status inesperado do provedor de pagamento.');
      return mapped;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw this.providerError(error, 'create_pix');
    }
  }

  async getPaymentStatus(id: string, providerApi: ProviderApi = 'orders') {
    try {
      if (providerApi === 'payments') {
        if (!this.legacyPayment) throw new AppError('failed-precondition', 'Consulta de pagamento legado não configurada.');
        return mapLegacyPayment(await this.legacyPayment.get({ id }));
      }
      return mapOrder(await this.order.get({ id }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw this.providerError(error, 'get_payment');
    }
  }

  private providerError(error: unknown, operation: 'create_pix' | 'get_payment') {
    const diagnostics = normalizeProviderError(error);
    financialError('payment_provider_error', { provider: 'mercado_pago', operation, category: diagnostics.category, httpStatus: diagnostics.httpStatus, providerCode: diagnostics.providerCode, retryable: diagnostics.retryable });
    return new ProviderError(diagnostics, operation);
  }

  async createCardPayment(): Promise<never> { throw new AppError('unimplemented', 'not-implemented'); }
  async createBoletoPayment(): Promise<never> { throw new AppError('unimplemented', 'not-implemented'); }
  async refundPayment(): Promise<never> { throw new AppError('unimplemented', 'not-implemented'); }
}
