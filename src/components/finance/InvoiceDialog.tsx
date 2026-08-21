import { useState } from 'react';
import type { Brand, Invoice, PixKeyType } from '../../types';
import GlobalModal from '../ui/GlobalModal';
import { useMediaUpload } from '../../hooks/useMediaUpload';

type InvoiceInput = Partial<Invoice> & { brandId: string; description: string; amount: number; dueDate: string };

export default function InvoiceDialog({ invoice, brands, processing, onCancel, onConfirm }: { invoice?: Invoice; brands: Brand[]; processing: boolean; onCancel: () => void; onConfirm: (data: InvoiceInput, boletoMediaId?: string) => Promise<void> }) {
  const [brandId, setBrandId] = useState(invoice?.brandId ?? '');
  const [description, setDescription] = useState(invoice?.description ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [amount, setAmount] = useState(invoice?.amount?.toString() ?? '');
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? '');
  const [referenceMonth, setReferenceMonth] = useState(invoice?.referenceMonth ?? '');
  const [pixKey, setPixKey] = useState(invoice?.pixKey ?? '');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(invoice?.pixKeyType ?? 'random');
  const [boletoUrl, setBoletoUrl] = useState(invoice?.boletoUrl ?? '');
  const [error, setError] = useState('');
  const upload = useMediaUpload();
  const uploadItem = upload.items[0];

  const choose = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return setError('O boleto deve ser um arquivo PDF.');
    try { upload.clearAll(); upload.enqueue(brandId, [file], 'invoice'); upload.start(); setError(''); }
    catch { setError('Não foi possível preparar o PDF.'); }
  };

  const submit = async () => {
    const numeric = Number(amount.replace(',', '.'));
    if (!brandId || !description.trim() || !dueDate || !Number.isFinite(numeric) || numeric <= 0) return setError('Preencha cliente, descrição, valor e vencimento.');
    if (uploadItem && uploadItem.state !== 'completed') return setError('Aguarde o envio do boleto terminar.');
    try {
      await onConfirm({ brandId, description, notes: notes || undefined, amount: numeric, dueDate, referenceMonth: referenceMonth || undefined, pixKey: pixKey || undefined, pixKeyType: pixKey ? pixKeyType : undefined, boletoUrl: boletoUrl || undefined }, uploadItem?.mediaId);
    } catch { setError('Não foi possível salvar a fatura.'); }
  };

  return <GlobalModal title={invoice ? 'Editar fatura' : 'Nova fatura'} size="lg" onClose={onCancel} closeOnEscape={!processing} closeOnOverlay={!processing}><div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold">Cliente<select aria-label="Cliente" value={brandId} disabled={Boolean(invoice) || processing} onChange={event => setBrandId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3"><option value="">Selecione</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
    <label className="text-sm font-bold">Descrição<input aria-label="Descrição" value={description} onChange={event => setDescription(event.target.value)} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold">Valor<input aria-label="Valor" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold">Vencimento<input aria-label="Vencimento" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold">Competência opcional<input aria-label="Competência opcional" type="month" value={referenceMonth} onChange={event => setReferenceMonth(event.target.value)} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold">Tipo da chave Pix<select aria-label="Tipo da chave Pix" value={pixKeyType} onChange={event => setPixKeyType(event.target.value as PixKeyType)} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl border p-3"><option value="random">Aleatória</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option></select></label>
    <label className="text-sm font-bold">Chave Pix específica<input aria-label="Chave Pix" value={pixKey} onChange={event => setPixKey(event.target.value)} disabled={processing} placeholder="Opcional; usa a chave da agência" className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold">URL do boleto<input aria-label="URL do boleto" type="url" value={boletoUrl} onChange={event => setBoletoUrl(event.target.value)} disabled={processing} placeholder="https://" className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold sm:col-span-2">Observação<textarea aria-label="Observação" value={notes} onChange={event => setNotes(event.target.value)} disabled={processing} rows={3} className="mt-2 w-full rounded-xl border p-3" /></label>
    <label className="text-sm font-bold sm:col-span-2">Boleto manual em PDF<input aria-label="Boleto manual em PDF" type="file" accept="application/pdf,.pdf" disabled={!brandId || processing} onChange={event => choose(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border p-3" /></label>
    {uploadItem && <div className="rounded-xl bg-zinc-50 p-3 text-sm sm:col-span-2"><p>{uploadItem.file.name}: {uploadItem.state} ({uploadItem.progress.percentage}%)</p><div className="mt-2 flex gap-2">{['queued', 'uploading'].includes(uploadItem.state) && <button onClick={() => upload.cancel(uploadItem.id)} className="rounded-lg border px-3 py-2">Cancelar envio</button>}{['failed', 'cancelled'].includes(uploadItem.state) && <button onClick={() => upload.retry(uploadItem.id)} className="rounded-lg border px-3 py-2">Tentar novamente</button>}</div></div>}
    {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    <div className="flex justify-end gap-3 sm:col-span-2"><button disabled={processing} onClick={onCancel} className="min-h-11 rounded-xl border px-5 font-bold">Cancelar</button><button disabled={processing || upload.isUploading} onClick={() => void submit()} className="min-h-11 rounded-xl bg-black px-5 font-bold text-white">{processing ? 'Salvando...' : 'Salvar'}</button></div>
  </div></GlobalModal>;
}
