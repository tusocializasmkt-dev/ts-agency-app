import { CheckoutRejected, safeCheckoutUrl, type CheckoutProvider } from './invoice-checkout-domain.js';

export type PreferenceTransport = (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
export function createMercadoPagoCheckout(transport: PreferenceTransport): CheckoutProvider {
  return { async create(input) {
    const returnUrl = 'https://ts-agency-app.vercel.app/cliente/financeiro';
    const data = await transport({
      items: [{ id: input.invoiceId, title: input.description, quantity: 1, currency_id: input.currency, unit_price: input.amountCents / 100 }],
      external_reference: input.externalReference,
      back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      payment_methods: { excluded_payment_methods: [{ id: 'pix' }] },
      expires: true, expiration_date_to: input.expiresAt,
    });
    // init_point is the hosted URL; redirects are never interpreted as settlement.
    if (typeof data.id !== 'string' || !data.id || data.id.length > 256) throw new Error('invalid-preference');
    return { preferenceId: data.id, checkoutUrl: safeCheckoutUrl(data.init_point) };
  } };
}
export function mercadoPagoTransport(accessToken: string): PreferenceTransport {
  if (!accessToken.trim()) throw new Error('checkout-not-configured');
  return async body => {
    // Deliberately no automatic HTTP retry: Preferences creation is an external side effect.
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(12_000), redirect: 'error',
    });
    if ([400, 401, 403, 422].includes(response.status)) throw new CheckoutRejected();
    if (!response.ok) throw new Error('checkout-outcome-unknown');
    return await response.json() as Record<string, unknown>;
  };
}
