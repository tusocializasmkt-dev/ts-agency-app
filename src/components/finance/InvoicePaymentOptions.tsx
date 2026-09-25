import { useState } from 'react';
import type { AgencyConfig, Invoice } from '../../types';
import { useFeedback } from '../../hooks';
import { copyText } from '../../services/clipboard.service';
import { mercadoPagoLink, safeHttpsUrl } from '../../invoices/payment-settings';

export default function InvoicePaymentOptions({ invoice, config, isAdmin, busy, onReport }: { invoice: Invoice; config?: AgencyConfig; isAdmin: boolean; busy: boolean; onReport: () => void }) {
  const feedback = useFeedback();
  const [copying, setCopying] = useState(false);
  const [failedQr, setFailedQr] = useState<string>();
  if (invoice.status === 'payment_reported') return <p role="status" className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800">{isAdmin ? 'Pagamento informado pelo cliente. Confira o recebimento e confirme abaixo.' : 'Pagamento informado. Aguardando confirmação.'}</p>;
  if (!['pending', 'overdue'].includes(invoice.status)) return null;
  const key = (invoice.pixKey || config?.pixKey)?.trim();
  // A legacy invoice may override the agency key. Never pair it with a different account's QR.
  const qr = !invoice.pixKey || invoice.pixKey.trim() === config?.pixKey?.trim() ? safeHttpsUrl(config?.pixQrCodeUrl) : undefined;
  const card = mercadoPagoLink(config?.mercadopagoPaymentLink);
  const copy = async () => {
    if (!key) return;
    setCopying(true);
    try { await copyText(key); feedback.success('Pix copiado!'); }
    catch { feedback.error('Não foi possível copiar o Pix. Selecione e copie a chave abaixo.'); }
    finally { setCopying(false); }
  };
  return <section aria-label="Pagamento" className="w-full space-y-3 rounded-xl border bg-zinc-50 p-4">
    <h3 className="text-sm font-bold uppercase tracking-wide">Pagamento</h3>
    {(key || (qr && failedQr !== qr)) && <div className="space-y-3"><h4 className="font-bold">Pix</h4>
      {qr && failedQr !== qr && <img src={qr} alt="QR Code Pix da agência" onError={() => setFailedQr(qr)} className="h-48 w-48 max-w-full rounded-lg bg-white object-contain" />}
      {key && <><p className="break-all text-sm"><span className="block text-xs text-zinc-500">Chave Pix</span>{key}</p><button type="button" disabled={copying} onClick={() => void copy()} className="min-h-11 rounded-lg border bg-white px-4 text-sm font-bold disabled:opacity-50">{copying ? 'Copiando...' : 'Copiar Pix'}</button></>}
    </div>}
    {card && <div><h4 className="mb-2 font-bold">Cartão de crédito</h4><a href={card} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-bold text-white">Pagar com cartão</a></div>}
    {(key || qr || card) ? <p className="text-xs text-zinc-600">Confira o destinatário e o valor da fatura antes de pagar. Depois, informe o pagamento para conferência da agência.</p> : <p className="text-sm text-zinc-500">Meios de pagamento ainda não configurados. Fale com a agência.</p>}
    {!isAdmin && <button type="button" disabled={busy} onClick={onReport} className="min-h-11 rounded-lg border border-black bg-white px-4 text-sm font-bold disabled:opacity-50">Já fiz o pagamento</button>}
  </section>;
}
