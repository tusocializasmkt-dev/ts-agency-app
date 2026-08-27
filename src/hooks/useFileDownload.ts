import { useCallback, useState } from 'react';

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'arquivo';

export function useFileDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (id: string, url: string, fileName: string) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('invalid-download-url');
    setDownloadingId(id);
    try {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('download-failed');
        const blobUrl = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = safeFileName(fileName);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
      } catch {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) throw new Error('download-failed');
      }
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return { download, downloadingId };
}
