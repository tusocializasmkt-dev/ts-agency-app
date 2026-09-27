import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ create: vi.fn(), redirect: vi.fn(), error: vi.fn() }));
vi.mock('../config/features', () => ({ FEATURES: { invoiceCheckout: true } }));
vi.mock('../hooks', () => ({ useFeedback: () => ({ error: state.error }) }));
vi.mock('../services/invoice-checkout.service', async original => ({
  ...await original<typeof import('../services/invoice-checkout.service')>(),
  createInvoiceCheckout: state.create, redirectToInvoiceCheckout: state.redirect,
}));
import InvoicePaymentOptions from '../components/finance/InvoicePaymentOptions';
beforeEach(() => vi.resetAllMocks());
const show = () => render(<InvoicePaymentOptions invoice={{ id: 'invoice', brandId: 'brand', amount: 120, dueDate: '2026-10-01', status: 'pending' }} config={{ name: '', email: '', phone: '', socialLinks: {}, mercadopagoPaymentLink: 'https://mpago.la/legacy' }} isAdmin={false} busy={false} onReport={vi.fn()} />);
it('botão usa somente URL do backend e não confirma pagamento', async () => {
  let resolve!: (value: unknown) => void;
  state.create.mockImplementation(() => new Promise(done => { resolve = done; }));
  show(); fireEvent.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }));
  expect(screen.getByRole('button', { name: 'Abrindo checkout...' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Abrindo checkout...' }));
  expect(state.create).toHaveBeenCalledExactlyOnceWith('invoice');
  const checkoutUrl = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=backend';
  resolve({ checkoutUrl });
  await waitFor(() => expect(state.redirect).toHaveBeenCalledExactlyOnceWith(checkoutUrl));
  expect(screen.getByRole('button', { name: 'Já fiz o pagamento' })).toBeVisible();
});
it('falha não redireciona ao link global e mostra mensagem segura', async () => {
  state.create.mockRejectedValue({ code: 'functions/permission-denied', message: 'private' });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão');
  expect(state.redirect).not.toHaveBeenCalled();
});
