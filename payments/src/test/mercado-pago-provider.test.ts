import { createHmac } from 'node:crypto';
import test from 'node:test'; import assert from 'node:assert/strict';
import { MercadoPagoError, type Order, type Payment } from 'mercadopago';
import { MercadoPagoProvider, mapMercadoPagoStatus, toMercadoPagoExternalReference } from '../payments/providers/mercado-pago.provider.js';
import { normalizeProviderError, ProviderError } from '../payments/provider-error.js';
import { verifyMercadoPagoWebhook } from '../payments/webhook.service.js';

type OrderClientMock = { create: Order['create']; get: Order['get'] };
type PaymentClientMock = { get: Payment['get'] };
const input = { paymentId: 'payment-1', invoiceId: 'invoice-1', amountCents: 1055, currency: 'BRL' as const, description: 'Mensalidade', payer: { email: 'buyer@testuser.com' }, externalReference: 'invoice-1/payment-1', idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' };
const processingOrder = { id: 'order-123', status: 'processing', created_date: '2026-08-10T19:30:00.000Z', transactions: { payments: [{ status: 'processing', status_detail: 'in_process', expiration_time: 'PT30M', payment_method: { id: 'pix', type: 'bank_transfer' } }] } };
const pendingOrder = { ...processingOrder, status: 'action_required', transactions: { payments: [{ status: 'action_required', status_detail: 'waiting_transfer', date_of_expiration: '2026-08-10T20:00:00.000Z', payment_method: { id: 'pix', type: 'bank_transfer', qr_code: 'pix-copy-paste', qr_code_base64: 'image-base64' } }] } };

test('cria Order Pix com valores string, referência e idempotência', async () => {
  const provider = new MercadoPagoProvider('orders-token', undefined, 8_000, 'sandbox'); let captured: unknown;
  (provider as unknown as { order: OrderClientMock }).order = { create: async (data: Parameters<Order['create']>[0]) => { captured = data; return processingOrder; }, get: async () => processingOrder } as unknown as OrderClientMock;
  const result = await provider.createPixPayment(input);
  const request = captured as { body: { type: string; processing_mode: string; total_amount: string; external_reference: string; transactions: { payments: Array<{ amount: string; payment_method: { id: string; type: string }; expiration_time: string }> } }; requestOptions: { idempotencyKey: string } };
  assert.equal(request.body.type, 'online'); assert.equal(request.body.processing_mode, 'automatic'); assert.equal(request.body.total_amount, '10.55'); assert.equal(request.body.transactions.payments[0].amount, '10.55'); assert.equal(request.body.transactions.payments[0].payment_method.id, 'pix'); assert.equal(request.body.transactions.payments[0].payment_method.type, 'bank_transfer'); assert.equal(request.body.transactions.payments[0].expiration_time, 'PT30M'); assert.equal(request.body.external_reference, 'invoice-1_payment-1'); assert.equal(request.requestOptions.idempotencyKey, input.idempotencyKey);
  assert.equal(result.providerPaymentId, 'order-123'); assert.equal(result.providerApi, 'orders'); assert.equal(result.status, 'processing'); assert.equal(result.pix, undefined);
});
test('normaliza external_reference Orders para o conjunto seguro e limite documental', () => { assert.equal(toMercadoPagoExternalReference('invoice-1/payment-1'), 'invoice-1_payment-1'); assert.equal(toMercadoPagoExternalReference(`inv/${'x'.repeat(200)}`).length, 150); assert.match(toMercadoPagoExternalReference('inv/ç espaço'), /^[a-zA-Z0-9_-]+$/); });
test('consulta Order posterior e incorpora QR Pix', async () => {
  const provider = new MercadoPagoProvider('orders-token', undefined, 8_000, 'sandbox');
  (provider as unknown as { order: OrderClientMock }).order = { create: async () => pendingOrder, get: async () => pendingOrder } as unknown as OrderClientMock;
  const result = await provider.getPaymentStatus('order-123');
  assert.equal(result.status, 'pending'); assert.equal(result.pix?.copyPasteCode, 'pix-copy-paste'); assert.equal(result.pix?.qrCodeImage, 'image-base64');
});
test('mantém consulta legada pela Payments API sem usá-la para novas criações', async () => {
  const provider = new MercadoPagoProvider('orders-token', 'legacy-token', 8_000, 'sandbox');
  const legacy = { id: 123, status: 'approved', status_detail: 'accredited', date_approved: '2026-08-10T20:00:00.000Z' };
  (provider as unknown as { legacyPayment: PaymentClientMock }).legacyPayment = { get: async () => legacy } as unknown as PaymentClientMock;
  const result = await provider.getPaymentStatus('123', 'payments'); assert.equal(result.providerApi, 'payments'); assert.equal(result.status, 'approved');
});
test('mapeia estados Orders e Payments sem default aprovado', () => { assert.equal(mapMercadoPagoStatus('processed', 'accredited'), 'approved'); assert.equal(mapMercadoPagoStatus('action_required', 'waiting_transfer'), 'pending'); assert.equal(mapMercadoPagoStatus('processing'), 'processing'); assert.equal(mapMercadoPagoStatus('expired'), 'expired'); assert.equal(mapMercadoPagoStatus('failed'), 'rejected'); assert.equal(mapMercadoPagoStatus('mystery'), 'unknown'); });
test('normaliza categorias HTTP do provider sem inferência adicional', () => { const cases = [[401, 'authorization', false], [403, 'authorization', false], [400, 'invalid_request', false], [422, 'invalid_request', false], [429, 'rate_limit', true], [500, 'provider_unavailable', true]] as const; for (const [status, category, retryable] of cases) assert.deepEqual(normalizeProviderError(new MercadoPagoError({ status, message: 'safe', error: 'provider_code' })), { category, httpStatus: status, providerCode: 'provider_code', providerType: 'MercadoPagoError', providerMessage: 'safe', retryable }); assert.equal(normalizeProviderError(new Error('socket timeout')).category, 'network'); assert.equal(normalizeProviderError({}).category, 'unknown'); });
test('saneia mensagem e nunca preserva token, Authorization, header ou payer', () => { const sensitive = 'Authorization: Bearer secret-value access_token=token-value buyer@example.com'; const diagnostics = normalizeProviderError(new MercadoPagoError({ status: 401, message: sensitive, error: 'bad_auth' })); const serialized = JSON.stringify(diagnostics); assert.doesNotMatch(serialized, /secret-value|token-value|buyer@example\.com/i); assert.match(serialized, /\[redacted\]|\[email\]/); assert.equal(new ProviderError(diagnostics, 'create_pix').message, 'Mercado Pago indisponível. Tente novamente.'); });
test('webhook aceita assinatura oficial e rejeita inválida, ausente e antiga', () => { const secret = 'webhook-secret'; const dataId = '123'; const requestId = 'request-1'; const ts = String(Math.floor(Date.now() / 1000)); const digest = createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex'); assert.doesNotThrow(() => verifyMercadoPagoWebhook({ xSignature: `ts=${ts},v1=${digest}`, xRequestId: requestId, dataId, secret })); assert.throws(() => verifyMercadoPagoWebhook({ xSignature: `ts=${ts},v1=invalid`, xRequestId: requestId, dataId, secret })); assert.throws(() => verifyMercadoPagoWebhook({ xRequestId: requestId, dataId, secret })); const oldTs = String(Number(ts) - 600); const oldDigest = createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${oldTs};`).digest('hex'); assert.throws(() => verifyMercadoPagoWebhook({ xSignature: `ts=${oldTs},v1=${oldDigest}`, xRequestId: requestId, dataId, secret })); });
