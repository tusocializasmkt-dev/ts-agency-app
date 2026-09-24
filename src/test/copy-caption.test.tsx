import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CopyCaptionButton from '../components/posts/CopyCaptionButton';
import { copyText } from '../services/clipboard.service';

const initialClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
beforeEach(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined }));
afterEach(() => { if (initialClipboard) Object.defineProperty(navigator, 'clipboard', initialClipboard); else delete (navigator as unknown as Record<string, unknown>).clipboard; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const caption = '  Texto completo 🚚\n\nSegunda linha ❤️ #TSAgency #Cliente  ';
it('copia somente a legenda inteira e anuncia sucesso', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as never);
  render(<CopyCaptionButton caption={caption} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar legenda' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Legenda copiada!'));
  expect(writeText).toHaveBeenCalledExactlyOnceWith(caption);
});
it('anuncia falha sem falso sucesso', async () => {
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText: vi.fn().mockRejectedValue(new Error('denied')) } as never);
  render(<CopyCaptionButton caption={caption} />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não foi possível copiar a legenda.'));
});
it.each([undefined, '', ' \n '])('legenda vazia fica indisponível: %s', value => {
  render(<CopyCaptionButton caption={value} />); expect(screen.getByRole('button')).toBeDisabled();
});
it('fallback copia texto puro e devolve foco sem deixar textarea', async () => {
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as never);
  const previous = document.createElement('button'); document.body.appendChild(previous); previous.focus();
  const exec = vi.fn(() => { expect((document.activeElement as HTMLTextAreaElement).value).toBe(caption); return true; });
  const old = document.execCommand; document.execCommand = exec;
  try { await copyText(caption); expect(exec).toHaveBeenCalledWith('copy'); expect(document.activeElement).toBe(previous); expect(document.querySelector('textarea')).toBeNull(); }
  finally { document.execCommand = old; previous.remove(); }
});
