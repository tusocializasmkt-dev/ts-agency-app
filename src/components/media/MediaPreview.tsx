import { useEffect, useState } from 'react';
import { File, FileText } from 'lucide-react';

export interface MediaPreviewProps { file: File; }

export default function MediaPreview({ file }: MediaPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { setUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (file.type.startsWith('image/') && url) return <img src={url} alt={`Preview de ${file.name}`} className="h-20 w-20 rounded-xl object-cover bg-zinc-100" />;
  if (file.type.startsWith('video/') && url) return <video src={url} aria-label={`Preview de ${file.name}`} controls preload="metadata" className="h-20 w-28 rounded-xl bg-black object-cover" />;
  if (file.type === 'application/pdf') return <div className="h-20 w-20 rounded-xl bg-zinc-100 flex items-center justify-center" aria-label={`Arquivo PDF ${file.name}`}><FileText className="h-7 w-7 text-zinc-500" /></div>;
  return <div className="h-20 w-20 rounded-xl bg-zinc-100 flex items-center justify-center" aria-label={`Arquivo ${file.name}`}><File className="h-7 w-7 text-zinc-500" /></div>;
}
