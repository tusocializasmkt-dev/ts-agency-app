import { isOrderId } from './mercado-pago-checkout.js';
import { invoiceAmountCents } from './invoice-checkout-domain.js';

export interface ProviderPayment {
  id: string; externalReference: string; invoiceId: string; preferenceId: string;
  amountCents: number; currency: string; collectorId: string; liveMode?: boolean; providerOrderId?: string;
  status: string; updatedAtMs: number; refunded: boolean; associationValid: boolean;
}
export interface PaymentReader {
  getPayment(id: string): Promise<ProviderPayment>;
  searchPayments(reference: string): Promise<string[]>;
}
export type ProviderGet = (path: string) => Promise<Record<string, any>>;
const externalId = (id: unknown): string => {
  if ((typeof id !== 'string' && typeof id !== 'number') || (typeof id === 'number' && !Number.isSafeInteger(id)) || !/^\d{1,32}$/.test(String(id))) throw new Error('invalid-provider-id');
  return String(id);
};
export function createPaymentReader(get: ProviderGet): PaymentReader {
  return {
    async getPayment(id) {
      if (isOrderId(id)) {
        const order = await get(`/v1/orders/${id}`);
        if (order.id !== id) throw new Error('provider-id-mismatch');
        const amountCents = orderMoney(order.total_amount);
        const paid = orderMoney(order.total_paid_amount, true);
        const updatedAtMs = Date.parse(order.last_updated_date);
        if (!Number.isFinite(updatedAtMs)) throw new Error('invalid-provider-time');
        const detail = String(order.status_detail || '');
        const payments = order.transactions?.payments;
        const refunded = /refund|charge|disput|mediation/.test(detail + ':' + String(order.status))
          || (Array.isArray(payments) && payments.some((p: any) => /refund|charge|disput/.test(String(p.status) + ':' + String(p.status_detail))));
        const accredited = order.status === 'processed' && detail === 'accredited' && paid === amountCents && !refunded;
        const status = accredited ? 'approved' : refunded ? 'refunded'
          : ['created', 'processing', 'action_required'].includes(order.status) ? 'pending'
          : order.status === 'failed' ? 'rejected' : order.status === 'canceled' ? 'cancelled' : 'unknown';
        return {
          id, providerOrderId: id, externalReference: typeof order.external_reference === 'string' ? order.external_reference : '',
          invoiceId: '', preferenceId: '', amountCents, currency: String(order.currency || ''),
          collectorId: externalId(order.user_id), ...(typeof order.live_mode === 'boolean' ? { liveMode: order.live_mode } : {}),
          status, updatedAtMs, refunded,
          associationValid: order.type === 'online' && order.processing_mode === 'manual',
        };
      }
      externalId(id);
      const payment = await get(`/v1/payments/${id}`);
      if (externalId(payment.id) !== id) throw new Error('provider-id-mismatch');
      const base = {
        id, externalReference: typeof payment.external_reference === 'string' ? payment.external_reference : '',
        amountCents: invoiceAmountCents(payment.transaction_amount), currency: String(payment.currency_id || ''),
        collectorId: externalId(payment.collector_id), liveMode: payment.live_mode,
        status: typeof payment.status === 'string' ? payment.status.slice(0, 64) : 'unknown',
        updatedAtMs: Date.parse(payment.date_last_updated), refunded: Number(payment.transaction_amount_refunded || 0) > 0,
      };
      if (typeof base.liveMode !== 'boolean' || !Number.isFinite(base.updatedAtMs)) throw new Error('invalid-provider-payment');
      if (payment.order?.type !== 'mercadopago') return { ...base, invoiceId: '', preferenceId: '', associationValid: false };
      const order = await get(`/merchant_orders/${externalId(payment.order.id)}`);
      const preferenceId = String(order.preference_id || '');
      if (!/^[A-Za-z0-9_-]{1,256}$/.test(preferenceId)) return { ...base, invoiceId: '', preferenceId: '', associationValid: false };
      const preference = await get(`/checkout/preferences/${preferenceId}`);
      const item = preference.items?.[0];
      const associationValid = String(preference.id) === preferenceId && preference.external_reference === base.externalReference
        && order.external_reference === base.externalReference && String(order.collector?.id) === base.collectorId
        && String(preference.collector_id) === base.collectorId
        && Array.isArray(order.payments) && order.payments.some((entry: any) => String(entry.id) === id)
        && Array.isArray(preference.items) && preference.items.length === 1 && item.quantity === 1
        && invoiceAmountCents(item.unit_price) === base.amountCents && item.currency_id === base.currency;
      return { ...base, preferenceId, invoiceId: typeof item?.id === 'string' ? item.id : '', associationValid };
    },
    async searchPayments(reference) {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(reference)) throw new Error('invalid-reference');
      const result = await get(`/v1/payments/search?external_reference=${encodeURIComponent(reference)}&limit=50&offset=0&sort=date_last_updated&criteria=desc`);
      // Fail closed on truncation. An empty search is never proof that a preference cannot be paid.
      if (!Array.isArray(result.results) || !Number.isInteger(result.paging?.total) || result.paging.total > 50 || result.results.length !== result.paging.total) throw new Error('incomplete-provider-search');
      return [...new Set<string>(result.results.map((p: any) => externalId(p.id)))];
    },
  };
}
export function mercadoPagoGet(accessToken: string): ProviderGet {
  if (!accessToken.trim()) throw new Error('checkout-not-configured');
  return async path => {
    if (!/^\/(v1\/orders\/ORD[A-Za-z0-9]+$|v1\/payments(?:\/|\?)|merchant_orders\/|checkout\/preferences\/)/.test(path)) throw new Error('invalid-provider-path');
    const response = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) throw new Error('provider-query-failed');
    return await response.json() as Record<string, unknown>;
  };
}

// Orders monetary fields are decimal strings. Reject exponent, rounding and coercion.
function orderMoney(value: unknown, allowZero = false): number {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('invalid-order-money');
  if (allowZero && Number(value) === 0) return 0;
  return invoiceAmountCents(Number(value));
}
