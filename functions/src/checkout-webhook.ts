import type { Firestore } from 'firebase-admin/firestore';
import { verifyCheckoutNotification, WebhookInputError, type WebhookInput } from './checkout-webhook-auth.js';
import { processCheckoutEvent, type PaymentPolicy } from './checkout-payment-processing.js';
import type { PaymentReader } from './checkout-payment-provider.js';

export async function handleCheckoutWebhook(input: WebhookInput, secret: string, services: () => Promise<{ db: Firestore; reader: PaymentReader; policy: PaymentPolicy }>): Promise<number> {
  let notification;
  try { notification = verifyCheckoutNotification(input, secret); }
  catch (error) { if (error instanceof WebhookInputError) return error.status; throw error; }
  if (!notification) return 204;
  const { db, reader, policy } = await services();
  // Old captured signatures cannot introduce new work. Already durable deliveries can retry.
  if (notification.stale && !(await db.doc(`checkout_webhook_events/${notification.eventId}`).get()).exists) return 401;
  const result = await processCheckoutEvent(db, notification.eventId, notification.externalPaymentId, reader, policy);
  return result.retryable ? 503 : 200;
}
