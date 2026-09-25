import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), copy: vi.fn() }));
vi.mock('../hooks', () => ({ useFeedback: () => state }));
vi.mock('../services/clipboard.service', () => ({ copyText: state.copy }));
import InvoicePaymentOptions from '../components/finance/InvoicePaymentOptions';
import { mercadoPagoLink, validatePaymentSettings } from '../invoices/payment-settings';
import type { AgencyConfig, Invoice } from '../types';
const invoice: Invoice = { id: 'i', brandId: 'b', amount: 100, dueDate: '2026-09-10', status: 'pending' };
const config: AgencyConfig = { name: '', email: '', phone: '', socialLinks: {}, pixKey: '12.345.678/0001-90', pixQrCodeUrl: 'https://example.com/qr.png', mercadopagoPaymentLink: 'https://mpago.la/test' };
const show = (extra = {}, settings: AgencyConfig = config) => render(<InvoicePaymentOptions invoice={invoice} config={settings} isAdmin={false} busy={false} onReport={vi.fn()} {...extra} />);
describe('meios simples de pagamento', () => {
  beforeEach(() => { vi.clearAllMocks(); state.copy.mockResolvedValue(undefined); });
  it('mostra QR e copia somente a chave, com feedback', async () => {
    show(); expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', config.pixQrCodeUrl);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar Pix' }));
    await waitFor(() => expect(state.success).toHaveBeenCalledWith('Pix copiado!'));
    expect(state.copy).toHaveBeenCalledWith(config.pixKey);
  });
  it('trata falha de clipboard e mantém chave selecionável', async () => {
    state.copy.mockRejectedValueOnce(new Error()); show(); fireEvent.click(screen.getByRole('button', { name: 'Copiar Pix' }));
    await waitFor(() => expect(state.error).toHaveBeenCalled()); expect(screen.getByText(config.pixKey!)).toBeVisible();
  });
  it('cartão usa link externo seguro sem formulário ou confirmação automática', () => {
    show(); const link = screen.getByRole('link', { name: 'Pagar com cartão' });
    expect(link).toHaveAttribute('href', config.mercadopagoPaymentLink); expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('ausência de meios ou URLs inválidas não cria opções quebradas', () => {
    show({}, { ...config, pixKey: '', pixQrCodeUrl: 'javascript:bad()', mercadopagoPaymentLink: 'https://evil.test/pay' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.queryByRole('link')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Copiar Pix' })).not.toBeInTheDocument();
  });
  it('QR com erro desaparece, preservando chave e alternativas', () => {
    show(); fireEvent.error(screen.getByAltText('QR Code Pix da agência')); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Copiar Pix' })).toBeVisible();
  });
  it('chave específica da fatura não recebe QR de outra conta', () => {
    show({ invoice: { ...invoice, pixKey: 'outra-chave' } }); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.getByText('outra-chave')).toBeVisible();
  });
  it('cliente informa; estado informado esconde ação e não diz pago', () => {
    const onReport = vi.fn(); const view = show({ onReport }); fireEvent.click(screen.getByRole('button', { name: 'Já fiz o pagamento' })); expect(onReport).toHaveBeenCalledOnce();
    view.rerender(<InvoicePaymentOptions invoice={{ ...invoice, status: 'payment_reported' }} config={config} isAdmin={false} busy={false} onReport={onReport} />);
    expect(screen.getByRole('status')).toHaveTextContent('Pagamento informado. Aguardando confirmação.'); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each(['paid', 'suspended', 'cancelled'] as const)('não incentiva pagamento de fatura %s', status => { show({ invoice: { ...invoice, status } }); expect(screen.queryByRole('link')).not.toBeInTheDocument(); expect(screen.queryByRole('button')).not.toBeInTheDocument(); });
  it('ação é desabilitada enquanto processa e Admin não informa como cliente', () => {
    const view = show({ busy: true }); expect(screen.getByRole('button', { name: 'Já fiz o pagamento' })).toBeDisabled();
    view.rerender(<InvoicePaymentOptions invoice={invoice} config={config} isAdmin busy={false} onReport={vi.fn()} />); expect(screen.queryByRole('button', { name: 'Já fiz o pagamento' })).not.toBeInTheDocument();
  });
  it.each(['http://mpago.la/a', 'javascript:alert(1)', 'https://mercadopago.com.br.evil.test/pay', 'https://mercadopago.com.br@evil.test/pay', 'https://evil.test/mercadopago.com.br', 'https://mpago.la:9000/a', 'https://mpago.la/'])('rejeita link inválido %s', url => {
    expect(mercadoPagoLink(url)).toBeUndefined(); expect(() => validatePaymentSettings({ mercadopagoPaymentLink: url })).toThrow(/Mercado Pago/);
  });
  it('aceita links oficiais e campos vazios; rejeita QR não HTTPS', () => {
    expect(mercadoPagoLink(' https://link.mercadopago.com.br/agencia ')).toBe('https://link.mercadopago.com.br/agencia'); expect(() => validatePaymentSettings({})).not.toThrow(); expect(() => validatePaymentSettings({ pixQrCodeUrl: 'http://example.com/qr.png' })).toThrow(/HTTPS/);
  });
});
