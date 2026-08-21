import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { ALLOWED_MEDIA_EXTENSIONS, ALLOWED_MEDIA_MIME_TYPES, validateMediaBatch } from '../../media';

interface MediaDropzoneProps {
  brandSelected: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onError: (message: string) => void;
}

const accept = [...ALLOWED_MEDIA_MIME_TYPES, ...ALLOWED_MEDIA_EXTENSIONS.map(extension => `.${extension}`)].join(',');

export default function MediaDropzone({ brandSelected, disabled = false, onFiles, onError }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const receive = (files: File[]) => {
    if (!brandSelected) { onError('Selecione um cliente antes de adicionar arquivos.'); return; }
    const validation = validateMediaBatch(files);
    if (!validation.valid) { onError(validation.errors.map(error => error.message).filter((message, index, all) => all.indexOf(message) === index).join(' ')); return; }
    onFiles(files);
  };
  const open = () => { if (!disabled) inputRef.current?.click(); };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); if (!disabled) receive(Array.from(event.dataTransfer.files)); };

  return <div
    role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
    aria-label="Selecionar ou arrastar arquivos para upload"
    onClick={event => { if (event.target !== inputRef.current) open(); }} onKeyDown={keyDown}
    onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
    onDragOver={event => event.preventDefault()}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={drop}
    className={`rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${dragging ? 'border-black bg-zinc-100' : 'border-zinc-300 bg-white hover:border-zinc-500'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
  >
    <input ref={inputRef} id="media-files" type="file" multiple accept={accept} className="sr-only" aria-label="Escolher arquivos de mídia" disabled={disabled} onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) receive(files); event.target.value = ''; }} />
    <UploadCloud className="mx-auto mb-4 h-9 w-9 text-zinc-500" />
    <p className="font-bold text-zinc-900">Arraste arquivos aqui ou clique para selecionar</p>
    <p className="mt-2 text-sm text-zinc-500">Imagens JPG, PNG, WebP e vídeos MP4 ou MOV.</p>
  </div>;
}
