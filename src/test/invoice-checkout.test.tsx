import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('../data/functions/invoice-checkout.functions', () => ({ callCreateInvoiceCheckout: state.call }));
import { useInvoiceCheckout } from '../hooks/useInvoiceCheckout';
import { createInvoiceCheckout, validateHostedCheckoutUrl } from '../services/invoice-checkout.service';
beforeEach(() => vi.resetAllMocks());
it('envia somente invoiceId e reutiliza a resposta validada', async () => {
  const result = { checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=p', expiresAt: 'later' };
  state.call.mockResolvedValue(result);
  expect(await createInvoiceCheckout('invoice')).toEqual(result);
  expect(state.call).toHaveBeenCalledWith('invoice');
});
it.each(['https://evil.test/checkout/v1', 'javascript:alert(1)', 'https://mercadopago.com.br.evil.test/checkout/v1', 'https://user@mercadopago.com.br/checkout/v1'])('rejeita redirecionamento inseguro %s', url => {
  expect(() => validateHostedCheckoutUrl(url)).toThrow();
});
it('bloqueia chamadas simultâneas e informa sessão expirada sem expor backend', async () => {
  let reject!: (error: unknown) => void;
  state.call.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
  const { result } = renderHook(() => useInvoiceCheckout('invoice'));
  let pending!: Promise<unknown>;
  act(() => { pending = result.current.start(); void result.current.start(); });
  expect(result.current.loading).toBe(true);
  expect(state.call).toHaveBeenCalledTimes(1);
  await act(async () => { reject({ code: 'functions/unauthenticated', message: 'private' }); await pending; });
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe('Sua sessão expirou. Entre novamente.');
});
