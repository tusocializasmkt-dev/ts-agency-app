import test from 'node:test';
import assert from 'node:assert/strict';
import { isMercadoPagoOrderEvent } from '../payments/webhook-event.js';

test('webhook aceita somente evento Order e ignora tópicos irrelevantes', () => {
  assert.equal(isMercadoPagoOrderEvent({ type: 'order', data: { id: 'ORD-1' } }), true);
  assert.equal(isMercadoPagoOrderEvent({ type: 'payment', data: { id: '1' } }), false);
  assert.equal(isMercadoPagoOrderEvent({}), false);
});
