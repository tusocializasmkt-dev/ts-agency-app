import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ applied: null as any, designs: [] as any[], save: vi.fn(), upload: vi.fn() }));
vi.mock('../appearance/AppearanceProvider', () => ({ useAppearance: () => state.applied }));
vi.mock('../appearance/useEditorPermission', () => ({ useEditorPermission: () => true }));
vi.mock('../appearance/appearance.service', () => ({ saveAppearance: state.save, uploadBackground: state.upload, watchDesigns: (next: (items: unknown[]) => void) => { next(state.designs); return () => {}; } }));
import AppearanceEditor from '../appearance/AppearanceEditor';
import { defaultAppearance, getDesktopBackground } from '../appearance/theme';
const image = 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0975642231.firebasestorage.app/o/agency%2Fappearance%2Ftest.png?alt=media';
beforeEach(() => {
  vi.resetAllMocks(); state.applied = structuredClone(defaultAppearance);
  state.upload.mockResolvedValue(image); state.save.mockResolvedValue(undefined);
  state.designs = [{ id: 'photo', theme: { ...defaultAppearance, name: 'Com imagem', sidebar: { ...defaultAppearance.sidebar, desktopBackground: { ...getDesktopBackground(defaultAppearance.sidebar), image, positionX: 25 } } } }, { id: 'solid', theme: { ...defaultAppearance, name: 'Cor sólida' } }];
});
const upload = () => fireEvent.change(screen.getByLabelText('Selecionar imagem do menu lateral'), { target: { files: [new File(['png'], 'test.png', { type: 'image/png' })] } });
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Aplicar globalmente' }));

it('upload produz prévia; controles desktop são salvos sem alterar campos mobile', async () => {
  render(<AppearanceEditor />); upload();
  expect(await screen.findByAltText('Prévia da imagem de fundo do menu lateral')).toHaveAttribute('src', image);
  expect(state.save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Posição horizontal do fundo'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Posição vertical do fundo'), { target: { value: '70' } });
  fireEvent.change(screen.getByLabelText('Escala do fundo'), { target: { value: '150' } });
  fireEvent.change(screen.getByLabelText('Opacidade da sobreposição'), { target: { value: '40' } });
  apply(); await waitFor(() => expect(state.save).toHaveBeenCalledOnce());
  expect(state.save.mock.calls[0][0].sidebar).toEqual({ ...defaultAppearance.sidebar, desktopBackground: expect.objectContaining({ image, positionX: 20, positionY: 70, scale: 150, overlay: 40 }) });
  expect(state.applied).toEqual(defaultAppearance);
});

it('troca combinações, remove imagem, restaura original e recupera a configuração persistida', async () => {
  const view = render(<AppearanceEditor />);
  fireEvent.change(screen.getByLabelText('Combinações salvas'), { target: { value: 'photo' } });
  expect(screen.getByAltText('Prévia da imagem de fundo do menu lateral')).toHaveAttribute('src', image);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar combinação' }));
  await waitFor(() => expect(state.save).toHaveBeenCalledWith(state.designs[0].theme, 'photo'));
  fireEvent.change(screen.getByLabelText('Combinações salvas'), { target: { value: 'solid' } });
  expect(screen.queryByAltText('Prévia da imagem de fundo do menu lateral')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Combinações salvas'), { target: { value: 'photo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remover imagem do menu lateral' }));
  apply(); await waitFor(() => expect(state.save).toHaveBeenCalledTimes(2));
  expect(state.save.mock.calls[1][0].sidebar.desktopBackground.image).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Carregar original' }));
  apply(); await waitFor(() => expect(state.save).toHaveBeenCalledTimes(3));
  expect(state.save.mock.calls[2][0]).toEqual(defaultAppearance);
  view.unmount(); state.applied = state.designs[0].theme;
  render(<AppearanceEditor />);
  expect(screen.getByLabelText('Posição horizontal do fundo')).toHaveValue('25');
  expect(screen.getByAltText('Prévia da imagem de fundo do menu lateral')).toHaveAttribute('src', image);
});

it('falhas de upload e de salvamento preservam a aparência já aplicada', async () => {
  state.upload.mockRejectedValueOnce(new Error('Use PNG, JPG ou WebP com até 2 MB.'));
  render(<AppearanceEditor />); upload();
  expect(await screen.findByText('Use PNG, JPG ou WebP com até 2 MB.')).toBeInTheDocument();
  expect(state.save).not.toHaveBeenCalled();
  expect(screen.queryByAltText('Prévia da imagem de fundo do menu lateral')).not.toBeInTheDocument();
  upload(); await screen.findByAltText('Prévia da imagem de fundo do menu lateral');
  state.save.mockRejectedValueOnce(new Error('permission-denied')); apply();
  await screen.findByText('Não foi possível concluir. Verifique a conexão e sua permissão.');
  expect(state.applied).toEqual(defaultAppearance);
});
