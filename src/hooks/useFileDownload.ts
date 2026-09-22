import { useCallback, useRef, useState } from 'react';
import { downloadFile } from '../services/file-download';

export function useFileDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const busy = useRef(false);

  const download = useCallback(async (id: string, url: string, fileName: string) => {
    if (busy.current) throw new Error('download-in-progress');
    busy.current = true;
    setDownloadingId(id);
    try {
      await downloadFile(url, fileName);
    } finally {
      busy.current = false;
      setDownloadingId(null);
    }
  }, []);

  return { download, downloadingId };
}
