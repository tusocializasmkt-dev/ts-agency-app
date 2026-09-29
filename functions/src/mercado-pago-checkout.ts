import { CheckoutRejected, safeCheckoutUrl, type CheckoutProvider } from './invoice-checkout-domain.js';

export type OrderTransport = (body: Record<string, unknown>, idempotencyKey: string) => Promise<Record<string, unknown>>;
export const isOrderId = (id: unknown): id is string => typeof id === 'string' && /^ORD[A-Za-z0-9]{1,61}$/.test(id);
export function createMercadoPagoCheckout(transport: OrderTransport): CheckoutProvider {
  return { async create(input) {
    if (input.currency !== 'BRL' || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error('invalid-order-amount');
    const amount = (input.amountCents / 100).toFixed(2);
    const returnUrl = 'https://ts-agency-app.vercel.app/cliente/financeiro';
    const data = await transport({
      type: 'online', processing_mode: 'manual', total_amount: amount,
      external_reference: input.externalReference, description: input.description, expiration_time: 'PT1H',
      items: [{ title: input.description, quantity: 1, unit_price: amount, total_amount: amount }],
      config: { online: { success_url: returnUrl, pending_url: returnUrl, failure_url: returnUrl }, payment_method: { not_allowed_ids: ['pix'] } },
    }, input.idempotencyKey);
    // Orders derives currency from the seller account. Reject non-BRL responses.
    if (!isOrderId(data.id) || data.currency !== 'BRL' || data.external_reference !== input.externalReference) throw new Error('invalid-order');
    return { providerOrderId: data.id, checkoutUrl: safeCheckoutUrl(data.checkout_url) };
  } };
}
export function mercadoPagoTransport(accessToken: string): OrderTransport {
  if (!accessToken.trim()) throw new Error('checkout-not-configured');
  return async (body, idempotencyKey) => {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(idempotencyKey)) throw new Error('invalid-idempotency-key');
    // Bounded retry of the SAME payload/key; never rotate after an uncertain outcome.
    let uncertain = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch('https://api.mercadopago.com/v1/orders', {
          method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey },
          body: JSON.stringify(body), signal: AbortSignal.timeout(12_000), redirect: 'error',
        });
        if ([400, 401, 403, 422].includes(response.status) && !uncertain) throw new CheckoutRejected();
        if (!response.ok) throw new Error('checkout-outcome-unknown');
        return await response.json() as Record<string, unknown>;
      } catch (error) {
        if (error instanceof CheckoutRejected) throw error;
        uncertain = true;
        if (attempt === 1) throw new Error('checkout-outcome-unknown');
      }
    }
    throw new Error('checkout-outcome-unknown');
  };
}
