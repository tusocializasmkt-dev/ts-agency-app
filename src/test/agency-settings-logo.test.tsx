import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ config: { name: 'Agência Teste', logoUrl: 'https://old.test/logo.png', phone: '', email: '', socialLinks: {} }, save: vi.fn(), setConfig: vi.fn(), feedback: { success: vi.fn(), error: vi.fn() } }));
const storage = vi.hoisted(() => ({ createStorageReference: vi.fn((path: string) => ({ path })), uploadFile: vi.fn(), getFileDownloadUrl: vi.fn(), deleteStoredFile: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isTeamMember: false }) }));
vi.mock('../services', () => ({ saveAgencyConfig: state.save, watchAgencyConfig: (onData: (data: unknown) => void) => { onData(state.config); return () => {}; } }));
vi.mock('../hooks', async () => ({ useAgencyConfig: (await import('../hooks/useAgencyConfig')).useAgencyConfig, useFeedback: () => state.feedback }));
vi.mock('../data/repositories/storage.repository', () => storage);
import AgencySettings from '../components/Admin/AgencySettings';

describe('logo nas configurações da agência', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); storage.deleteStoredFile.mockResolvedValue(undefined); state.config = { name: 'Agência Teste', logoUrl: 'https://old.test/logo.png', phone: '', email: '', socialLinks: {} }; state.setConfig.mockImplementation(next => { state.config = next; }); state.save.mockResolvedValue(undefined); storage.uploadFile.mockReturnValue({ completion: Promise.resolve({ path: 'uploaded' }) }); storage.getFileDownloadUrl.mockResolvedValue('https://new.test/logo.png'); vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }); });
  afterEach(() => vi.unstubAllGlobals());
  it('aceita imagem, usa o caminho lógico e persiste logoUrl', async () => { render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [new File(['png'], 'logo.png', { type: 'image/png' })] } }); expect(screen.getByAltText('Logotipo atual da agência')).toHaveAttribute('src', 'blob:preview'); await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: 'https://new.test/logo.png' }))); expect(storage.createStorageReference.mock.calls[0][0]).toMatch(/^agency\/logo\/logo-\d+-[a-f0-9-]+\.png$/); });
  it('rejeita arquivo maior que 5 MB e formato inválido', () => { render(<AgencySettings />); const large = new File(['x'], 'grande.png', { type: 'image/png' }); Object.defineProperty(large, 'size', { value: 5 * 1024 * 1024 + 1 }); const input = screen.getByLabelText('Selecionar logotipo da agência'); fireEvent.change(input, { target: { files: [large] } }); fireEvent.change(input, { target: { files: [new File(['x'], 'logo.gif', { type: 'image/gif' })] } }); expect(state.feedback.error).toHaveBeenCalledWith(expect.stringMatching(/5 MB/)); expect(state.feedback.error).toHaveBeenCalledWith(expect.stringMatching(/Formato inválido/)); expect(storage.uploadFile).not.toHaveBeenCalled(); });
  it('mantém o logo anterior quando o upload falha', async () => { storage.uploadFile.mockReturnValue({ completion: Promise.reject(new Error('falha')) }); render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [new File(['x'], 'logo.webp', { type: 'image/webp' })] } }); await waitFor(() => expect(state.feedback.error).toHaveBeenCalledWith(expect.stringMatching(/anterior foi mantido/))); expect(screen.getByAltText('Logotipo atual da agência')).toHaveAttribute('src', 'https://old.test/logo.png'); expect(state.save).not.toHaveBeenCalled(); });
  it('limpa novo arquivo se obtenção da URL falhar, sem gravar configuração', async () => {
    storage.getFileDownloadUrl.mockRejectedValueOnce({ code: 'storage/unauthorized' });
    render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [new File(['x'], 'logo.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(state.feedback.error).toHaveBeenCalledWith(expect.stringContaining('obter a URL')));
    expect(storage.deleteStoredFile).toHaveBeenCalledWith(storage.createStorageReference.mock.results[0].value);
    expect(state.save).not.toHaveBeenCalled(); expect(screen.getByAltText('Logotipo atual da agência')).toHaveAttribute('src', 'https://old.test/logo.png');
  });
  it('falha definitiva de persistência preserva logo anterior e limpa somente novo arquivo', async () => {
    state.save.mockRejectedValueOnce({ code: 'permission-denied' });
    render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(state.feedback.error).toHaveBeenCalledWith(expect.stringContaining('salvar o logotipo nas configurações')));
    expect(storage.getFileDownloadUrl).toHaveBeenCalled(); expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: 'https://new.test/logo.png' }));
    expect(storage.deleteStoredFile).toHaveBeenCalledTimes(1); expect(screen.getByAltText('Logotipo atual da agência')).toHaveAttribute('src', 'https://old.test/logo.png');
    expect(console.error).toHaveBeenCalledWith('agency_logo_failed', { stage: 'persist', code: 'permission-denied', cleanup: 'removed' });
  });
  it('não exclui arquivo potencialmente persistido em falha ambígua de rede', async () => {
    state.save.mockRejectedValueOnce({ code: 'unavailable' });
    render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(state.feedback.error).toHaveBeenCalledWith(expect.stringContaining('confirmar a gravação')));
    expect(storage.deleteStoredFile).not.toHaveBeenCalled();
  });
  it('aceita exatamente 5 MiB e atualiza visual só após persistência', async () => {
    let commit!: () => void; state.save.mockReturnValueOnce(new Promise<void>(resolve => { commit = resolve; }));
    const file = new File(['x'], 'logo.jpeg', { type: 'image/jpeg' }); Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
    render(<AgencySettings />); fireEvent.change(screen.getByLabelText('Selecionar logotipo da agência'), { target: { files: [file] } });
    await waitFor(() => expect(state.save).toHaveBeenCalled()); expect(state.feedback.success).not.toHaveBeenCalled();
    commit(); await waitFor(() => expect(screen.getByAltText('Logotipo atual da agência')).toHaveAttribute('src', 'https://new.test/logo.png'));
    expect(storage.deleteStoredFile).not.toHaveBeenCalled();
  });
});
