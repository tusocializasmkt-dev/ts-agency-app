import { useCallback, useEffect, useState } from 'react';
import type { Invoice } from '../types';
import type { Payment } from '../payments';
import { getInvoiceById } from '../data/repositories/invoices.repository';
import { createPixPayment, watchInvoicePayments, watchPayment } from '../services/payments.service';

export function usePaymentCheckout(invoiceId: string, brandId: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null); const [payment, setPayment] = useState<Payment | null>(null); const [loading, setLoading] = useState(true); const [creating, setCreating] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; getInvoiceById(invoiceId).then(item => { if (!active) return; if (!item || item.brandId !== brandId) { setError('Fatura não encontrada ou sem acesso.'); setLoading(false); return; } setInvoice(item); setLoading(false); }).catch(() => { if (active) { setError('Não foi possível carregar a fatura.'); setLoading(false); } }); return () => { active = false; }; }, [invoiceId, brandId]);
  useEffect(() => { if (!invoice) return; return watchInvoicePayments(invoice.id, items => setPayment(items.find(item => item.method === 'pix') ?? null), () => setError('Não foi possível acompanhar o pagamento.')); }, [invoice]);
  useEffect(() => { if (!payment?.id) return; return watchPayment(payment.id, value => setPayment(value), () => setError('Não foi possível atualizar o pagamento.')); }, [payment?.id]);
  const createPix = useCallback(async () => { setCreating(true); setError(null); try { const result = await createPixPayment(invoiceId, crypto.randomUUID()); setPayment(current => ({ ...(current ?? { id: result.paymentId, invoiceId, brandId: brandId!, provider: 'mercado_pago', method: 'pix', externalReference: '', idempotencyKey: '', currency: 'BRL' }), id: result.paymentId, status: result.status, amountCents: result.amountCents, ...(result.pix ? { pix: { copyPasteCode: result.pix.copyPasteCode, qrCodeImage: result.pix.qrCodeImage }, expiresAt: new Date(result.pix.expiresAt) } : result.expiresAt ? { expiresAt: new Date(result.expiresAt) } : {}) })); return result; } catch { setError('Não foi possível gerar o Pix. Tente novamente.'); return null; } finally { setCreating(false); } }, [invoiceId, brandId]);
  return { invoice, payment, pix: payment?.pix, loading, creating, error, createPix, retry: createPix, status: payment?.status ?? 'created' };
}
