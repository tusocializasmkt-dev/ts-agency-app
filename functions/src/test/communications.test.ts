import test from 'node:test';
import assert from 'node:assert/strict';
import { activeRecipient, deliveryId, validateCommunication } from '../communications.js';
const valid = { id: 'test', title: 'Olá', message: 'Mensagem', image: '', popup: true, audience: 'selected', recipients: ['client', 'client'], action: 'draft', scheduledAt: null, revision: 0 };
test('deduplica destinatários e valida os limites de conteúdo', () => {
  assert.deepEqual(validateCommunication(valid).recipients, ['client']);
  for (const patch of [{ title: '' }, { message: 'x'.repeat(4001) }, { recipients: [] }, { recipients: ['../../admin'] }, { popup: 'yes' }, { image: 'javascript:alert(1)' }, { revision: -1 }, { action: 'schedule', scheduledAt: Date.now() - 1000 }]) assert.throws(() => validateCommunication({ ...valid, ...patch }));
});
test('identificador de entrega estável e sem colisões por concatenação', () => {
  assert.equal(deliveryId('job', 'client'), deliveryId('job', 'client'));
  assert.notEqual(deliveryId('a_b', 'c'), deliveryId('a', 'b_c'));
});
test('envio exclui clientes bloqueados e inativos', () => {
  assert.equal(activeRecipient({ status: 'active' }), true);
  assert.equal(activeRecipient({ status: 'active', accessEnabled: false }), false);
  assert.equal(activeRecipient({ status: 'suspended' }), false);
});
