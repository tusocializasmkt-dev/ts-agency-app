import { useRef, useState } from 'react';
import * as service from '../services/invoice-management.service';
export function useInvoiceManagement() {
  const active = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const run = async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    if (active.current) return;
    active.current = true; setBusy(true); setError('');
    try { return await task(); } catch (cause) { setError(service.invoiceManagementError(cause)); return undefined; }
    finally { active.current = false; setBusy(false); }
  };
  return { busy, error, preview: (command: Record<string, unknown>) => run(() => service.previewInvoiceManagement(command)), confirm: (id: string) => run(() => service.confirmInvoiceManagement(id)), inspect: (id: string) => run(() => service.inspectInvoiceSeries(id)) };
}
