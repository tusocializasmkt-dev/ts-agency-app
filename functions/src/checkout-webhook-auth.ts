import { isOrderId } from './mercado-pago-checkout.js';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export class WebhookInputError extends Error {
  constructor(public readonly status: number) { super('invalid-webhook'); }
}
export interface WebhookInput { method: string; query: Record<string, unknown>; headers: Record<string, unknown>; body: unknown }
export interface VerifiedNotification { eventId: string; externalPaymentId: string; stale: boolean }
export function verifyCheckoutNotification(input: WebhookInput, secret: string, now = Date.now()): VerifiedNotification | null {
  if (input.method !== 'POST') throw new WebhookInputError(405);
  if (!secret) throw new WebhookInputError(503);
  const signature = input.headers['x-signature'];
  const requestId = input.headers['x-request-id'];
  const id = input.query['data.id'];
  if (typeof signature !== 'string' || signature.length > 256 || typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId) || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new WebhookInputError(401);
  const match = /^ts=(\d{10}|\d{13}),\s*v1=([a-fA-F0-9]{64})$/.exec(signature);
  if (!match) throw new WebhookInputError(401);
  const [, ts, digest] = match;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  if (!timingSafeEqual(expected, Buffer.from(digest, 'hex'))) throw new WebhookInputError(401);
  const time = Number(ts) * (ts.length === 10 ? 1000 : 1);
  if (time > now + 300_000) throw new WebhookInputError(401);
  const body = input.body as { type?: unknown; data?: { id?: unknown } } | null;
  if (!body || typeof body !== 'object' || typeof body.type !== 'string' || !body.data || String(body.data.id) !== id) throw new WebhookInputError(400);
  if (input.query.type !== undefined && input.query.type !== body.type) throw new WebhookInputError(400);
  if (!['order', 'payment'].includes(body.type)) return null;
  if (body.type === 'order' ? !isOrderId(id) : !/^[0-9]{1,32}$/.test(id)) throw new WebhookInputError(400);
  // Body event IDs/status/amount are unsigned and never used for authorization or settlement.
  return { eventId: createHash('sha256').update(manifest).digest('hex'), externalPaymentId: id, stale: now - time > 600_000 };
}
