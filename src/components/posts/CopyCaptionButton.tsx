import { useState } from 'react';
import { copyText } from '../../services/clipboard.service';

export default function CopyCaptionButton({ caption }: { caption?: string }) {
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState('');
  const copy = async () => {
    if (!caption?.trim() || copying) return;
    setCopying(true); setMessage('');
    try { await copyText(caption); setMessage('Legenda copiada!'); }
    catch { setMessage('Não foi possível copiar a legenda.'); }
    finally { setCopying(false); }
  };
  return <div><button type="button" disabled={!caption?.trim() || copying} onClick={() => void copy()} className="min-h-11 rounded-xl border px-4 text-sm font-bold disabled:opacity-50">Copiar legenda</button><p role="status" aria-live="polite" className="mt-1 text-sm">{message}</p></div>;
}
