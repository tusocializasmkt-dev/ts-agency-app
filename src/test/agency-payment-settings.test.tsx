import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn(), error: vi.fn(), upload: vi.fn(), url: vi.fn(), reference: vi.fn() }));
vi.mock('../hooks', async () => {
  const { useState } = await import('react');
  return { useFeedback: () => state, useAgencyConfig: () => {
    const [config, setConfig] = useState({ name: 'TS Agency', email: '', phone: '', socialLinks: {}, pixQrCodeUrl: 'https://example.com/old.png', mercadopagoPaymentLink: 'legacy-value' });
    return { config, setConfig, save: state.save, loading: false, changeLogo: vi.fn() };
  } };
});
vi.mock('../data/repositories/storage.repository', () => ({ createStorageReference: state.reference, uploadFile: state.upload, getFileDownloadUrl: state.url }));
import AgencySettings from '../components/Admin/AgencySettings';
beforeEach(() => {
  vi.resetAllMocks(); state.save.mockResolvedValue(undefined); state.upload.mockReturnValue({ completion: Promise.resolve('uploaded') }); state.url.mockResolvedValue('https://example.com/new.png');
  URL.createObjectURL = vi.fn(() => 'blob:preview'); URL.revokeObjectURL = vi.fn();
});
const select = (file: File) => fireEvent.change(screen.getByLabelText('Selecionar QR Code Pix'), { target: { files: [file] } });
it('salva Pix e QR global após upload, com preview e preserva campos existentes', async () => {
  render(<AgencySettings />);
  expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', 'https://example.com/old.png');
  fireEvent.change(screen.getByLabelText('Chave Pix'), { target: { value: 'cnpj-teste' } });
  fireEvent.change(screen.getByLabelText('Tipo da chave Pix'), { target: { value: 'cnpj' } });
  select(new File(['png'], 'qr.png', { type: 'image/png' }));
  expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', 'blob:preview'); expect(state.upload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ pixKey: 'cnpj-teste', pixKeyType: 'cnpj', pixQrCodeUrl: 'https://example.com/new.png', mercadopagoPaymentLink: 'legacy-value' })));
  expect(state.reference).toHaveBeenCalledWith(expect.stringMatching(/^agency\/payments\/pix-qr\/.+\.png$/));
  await waitFor(() => expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', 'https://example.com/new.png'));
});
it.each(['image/png', 'image/jpeg', 'image/webp'])('aceita %s', type => {
  render(<AgencySettings />); select(new File(['image'], 'qr', { type })); expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', 'blob:preview');
});
it.each([new File(['svg'], 'qr.svg', { type: 'image/svg+xml' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'qr.png', { type: 'image/png' })])('rejeita imagem inválida sem alterar QR atual', file => {
  render(<AgencySettings />); select(file); expect(state.error).toHaveBeenCalled(); expect(state.upload).not.toHaveBeenCalled(); expect(screen.getByAltText('QR Code Pix da agência')).toHaveAttribute('src', 'https://example.com/old.png');
});
it('loading impede duplicidade; falha de upload não persiste nem remove QR antigo', async () => {
  let reject!: (error: Error) => void; state.upload.mockReturnValue({ completion: new Promise((_, fail) => { reject = fail; }) });
  render(<AgencySettings />); select(new File(['image'], 'qr.png', { type: 'image/png' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('Enviando');
  reject(new Error('upload')); await waitFor(() => expect(state.error).toHaveBeenCalled()); expect(state.save).not.toHaveBeenCalled(); expect(state.upload).toHaveBeenCalledOnce();
});
it('falha de persistência mantém tentativa recuperável e não remove objeto anterior', async () => {
  state.save.mockRejectedValue(new Error('offline')); render(<AgencySettings />); select(new File(['image'], 'qr.png', { type: 'image/png' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(state.error).toHaveBeenCalled()); expect(state.success).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeEnabled();
});
