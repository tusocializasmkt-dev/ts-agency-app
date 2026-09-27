import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../hooks', async () => {
  const { useState } = await import('react');
  return { useFeedback: () => state, useAgencyConfig: () => {
    const [config, setConfig] = useState({ name: 'TS Agency', email: '', phone: '', socialLinks: {}, mercadopagoPaymentLink: 'legacy-value' });
    return { config, setConfig, save: state.save, loading: false, changeLogo: vi.fn() };
  } };
});
import AgencySettings from '../components/Admin/AgencySettings';
beforeEach(() => vi.clearAllMocks());
it('salva meios opcionais no modelo existente sem credenciais', async () => {
  render(<AgencySettings />);
  fireEvent.change(screen.getByLabelText('Chave Pix'), { target: { value: 'cnpj-teste' } });
  fireEvent.change(screen.getByLabelText('Tipo da chave Pix'), { target: { value: 'cnpj' } });
  fireEvent.change(screen.getByLabelText('URL HTTPS do QR Code Pix'), { target: { value: 'https://example.com/qr.png' } });
  expect(screen.queryByLabelText('Link de pagamento Mercado Pago')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ pixKey: 'cnpj-teste', pixKeyType: 'cnpj', pixQrCodeUrl: 'https://example.com/qr.png', mercadopagoPaymentLink: 'legacy-value' })));
});
it('impede salvar link inválido, explica e permite salvar vazio', async () => {
  render(<AgencySettings />); fireEvent.change(screen.getByLabelText('URL HTTPS do QR Code Pix'), { target: { value: 'http://example.com/qr.png' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' })); expect(state.save).not.toHaveBeenCalled(); expect(state.error).toHaveBeenCalledWith(expect.stringContaining('HTTPS'));
  fireEvent.change(screen.getByLabelText('URL HTTPS do QR Code Pix'), { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' })); await waitFor(() => expect(state.save).toHaveBeenCalledOnce());
});
