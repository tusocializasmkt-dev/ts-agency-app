import { useRef, useState } from 'react';
import { createInvoiceCheckout, checkoutErrorMessage } from '../services/invoice-checkout.service';
export function useInvoiceCheckout(invoiceId: string) {
  const active = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    if (active.current) return null;
    active.current = true; setLoading(true); setError(null);
    try { return await createInvoiceCheckout(invoiceId); }
    catch (cause) { setError(checkoutErrorMessage(cause)); return null; }
    finally { active.current = false; setLoading(false); }
  };
  return { start, loading, error };
}
