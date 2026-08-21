import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaDropzone from '../components/media/MediaDropzone';

const validFile = () => new File(['image'], 'foto.jpg', { type: 'image/jpeg' });
const renderDropzone = (brandSelected = true) => {
  const onFiles = vi.fn(); const onError = vi.fn();
  render(<MediaDropzone brandSelected={brandSelected} onFiles={onFiles} onError={onError} />);
  return { onFiles, onError, zone: screen.getByRole('button'), input: screen.getByLabelText('Escolher arquivos de mídia') };
};

describe('MediaDropzone', () => {
  it('recebe seleção manual', () => { const view = renderDropzone(); fireEvent.change(view.input, { target: { files: [validFile()] } }); expect(view.onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'foto.jpg' })]); });
  it('recebe drag and drop', () => { const view = renderDropzone(); fireEvent.dragEnter(view.zone, { dataTransfer: { files: [validFile()] } }); fireEvent.drop(view.zone, { dataTransfer: { files: [validFile()] } }); expect(view.onFiles).toHaveBeenCalledOnce(); });
  it('abre seletor por Enter e Espaço', () => { const view = renderDropzone(); const click = vi.spyOn(view.input as HTMLInputElement, 'click'); fireEvent.keyDown(view.zone, { key: 'Enter' }); fireEvent.keyDown(view.zone, { key: ' ' }); expect(click).toHaveBeenCalledTimes(2); });
  it('rejeita lote inválido', () => { const view = renderDropzone(); fireEvent.change(view.input, { target: { files: [new File(['x'], 'virus.exe', { type: 'application/octet-stream' })] } }); expect(view.onError).toHaveBeenCalledWith(expect.stringContaining('não é permitido')); expect(view.onFiles).not.toHaveBeenCalled(); });
  it('impede arquivo sem marca', () => { const view = renderDropzone(false); fireEvent.change(view.input, { target: { files: [validFile()] } }); expect(view.onError).toHaveBeenCalledWith(expect.stringContaining('Selecione um cliente')); expect(view.onFiles).not.toHaveBeenCalled(); });
});
