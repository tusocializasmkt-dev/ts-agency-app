import { invoiceAmountCents } from './invoice-checkout-domain.js';

export interface ProviderPayment {
  id: string; externalReference: string; invoiceId: string; preferenceId: string;
  amountCents: number; currency: string; collectorId: string; liveMode: boolean;
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
    if (!/^\/(v1\/payments(?:\/|\?)|merchant_orders\/|checkout\/preferences\/)/.test(path)) throw new Error('invalid-provider-path');
    const response = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) throw new Error('provider-query-failed');
    return await response.json() as Record<string, unknown>;
  };
}
