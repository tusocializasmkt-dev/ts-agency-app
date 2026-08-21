import test from 'node:test'; import assert from 'node:assert/strict';
import { approvedPaymentDecision, assertPaymentTransition, assertPixCapacity, invoiceAmountToCents, isValidIdempotencyKey, providerTransitionDecision } from '../payments/payment.domain.js';
import { MercadoPagoProvider } from '../payments/providers/mercado-pago.provider.js';
import { assertSandbox, requireSandboxToken } from '../config/payment-config.js';

test('converte Invoice decimal para centavos seguros', () => { assert.equal(invoiceAmountToCents(10), 1000); assert.equal(invoiceAmountToCents(10.5), 1050); assert.equal(invoiceAmountToCents(10.55), 1055); for (const invalid of [0, -1, NaN, Infinity, 10.555]) assert.throws(() => invoiceAmountToCents(invalid)); });
test('valida UUID-like idempotency key', () => { assert.equal(isValidIdempotencyKey('550e8400-e29b-41d4-a716-446655440000'), true); assert.equal(isValidIdempotencyKey('short'), false); assert.equal(isValidIdempotencyKey('x'.repeat(129)), false); });
test('bloqueia transições arbitrárias e aprovação controlada', () => { assert.doesNotThrow(() => assertPaymentTransition('pending', 'approved')); assert.throws(() => assertPaymentTransition('created', 'approved')); assert.throws(() => assertPaymentTransition('approved', 'pending')); });
test('protege double payment', () => { assert.equal(approvedPaymentDecision({ status: 'pending' }, 'p1'), 'settle'); assert.equal(approvedPaymentDecision({ status: 'paid', activePaymentId: 'p1' }, 'p1'), 'already-settled'); assert.equal(approvedPaymentDecision({ status: 'paid', activePaymentId: 'p1' }, 'p2'), 'duplicate-review'); assert.equal(approvedPaymentDecision({ status: 'pending', activePaymentId: 'p1' }, 'p2'), 'duplicate-review'); });
test('sandbox aceita token presente sem inferir ambiente pelo prefixo', () => {
  assert.equal(requireSandboxToken('prefixo-variavel', 'sandbox'), 'prefixo-variavel');
  assert.doesNotThrow(() => new MercadoPagoProvider('prefixo-variavel', undefined, 8_000, 'sandbox'));
});
test('produção e ambiente ausente permanecem bloqueados', () => {
  assert.doesNotThrow(() => assertSandbox('sandbox'));
  assert.throws(() => assertSandbox('production'));
  assert.throws(() => assertSandbox(undefined));
});
test('token ausente ou vazio permanece bloqueado', () => {
  assert.throws(() => requireSandboxToken(undefined, 'sandbox'), /access-token-required/);
  assert.throws(() => requireSandboxToken('   ', 'sandbox'), /access-token-required/);
});
test('limita Pix ativo e cinco novas tentativas por hora', () => { assert.doesNotThrow(() => assertPixCapacity(false, 4)); assert.throws(() => assertPixCapacity(true, 0)); assert.throws(() => assertPixCapacity(false, 5)); });
test('provider não regride estados terminais', () => { assert.equal(providerTransitionDecision('pending', 'approved'), 'apply'); assert.equal(providerTransitionDecision('approved', 'approved'), 'noop'); assert.equal(providerTransitionDecision('approved', 'pending'), 'ignore'); assert.equal(providerTransitionDecision('rejected', 'approved'), 'ignore'); assert.equal(providerTransitionDecision('pending', 'unknown'), 'ignore'); });
