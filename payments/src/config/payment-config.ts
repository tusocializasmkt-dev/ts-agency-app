import { defineSecret } from 'firebase-functions/params';

export type PaymentEnvironment = 'sandbox' | 'production';
export const MERCADO_PAGO_ACCESS_TOKEN = defineSecret('MERCADO_PAGO_ACCESS_TOKEN');
export const MERCADO_PAGO_ORDERS_ACCESS_TOKEN = defineSecret('MERCADO_PAGO_ORDERS_ACCESS_TOKEN');
export const MERCADO_PAGO_WEBHOOK_SECRET = defineSecret('MERCADO_PAGO_WEBHOOK_SECRET');
export const MERCADO_PAGO_ORDERS_WEBHOOK_SECRET = defineSecret('MERCADO_PAGO_ORDERS_WEBHOOK_SECRET');
export function assertSandbox(environment: string | undefined): asserts environment is PaymentEnvironment {
  if (environment !== 'sandbox') throw new Error('Sandbox payment environment is required.');
}
export function requireSandboxToken(token: string | undefined, environment = process.env.PAYMENT_ENVIRONMENT) {
  assertSandbox(environment);
  if (!token?.trim()) throw new Error('mercado-pago-access-token-required');
  return token;
}
