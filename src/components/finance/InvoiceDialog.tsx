import { useMemo, useRef, useState } from 'react';
import type { Brand, Invoice, PixKeyType, YearMonth } from '../../types';
import { buildRecurringDueDates, type InvoiceRecurrence } from '../../invoices';
import GlobalModal from '../ui/GlobalModal';
import { useMediaUpload } from '../../hooks/useMediaUpload';

export type InvoiceInput = Partial<Invoice> & { brandId: string; description: string; amount: number; dueDate: string };

export default function InvoiceDialog({ invoice, brands, processing, onCancel, onConfirm }: { invoice?: Invoice; brands: Brand[]; processing: boolean; onCancel: () => void; onConfirm: (data: InvoiceInput, boletoMediaId?: string, recurrence?: InvoiceRecurrence) => Promise<void> }) {
  const [chargeType, setChargeType] = useState<'single' | 'recurring'>('single');
  const [brandId, setBrandId] = useState(invoice?.brandId ?? ''); const [description, setDescription] = useState(invoice?.description ?? ''); const [notes, setNotes] = useState(invoice?.notes ?? ''); const [amount, setAmount] = useState(invoice?.amount?.toString() ?? ''); const [dueDate, setDueDate] = useState(invoice?.dueDate ?? ''); const [referenceMonth, setReferenceMonth] = useState(invoice?.referenceMonth ?? '');
  const [recurrenceStart, setRecurrenceStart] = useState<YearMonth>('' as YearMonth); const [recurrenceEnd, setRecurrenceEnd] = useState<YearMonth>('' as YearMonth); const [recurrenceDay, setRecurrenceDay] = useState('10');
  const [pixKey, setPixKey] = useState(invoice?.pixKey ?? ''); const [pixKeyType, setPixKeyType] = useState<PixKeyType>(invoice?.pixKeyType ?? 'random'); const [boletoUrl, setBoletoUrl] = useState(invoice?.boletoUrl ?? ''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false); const submittingRef = useRef(false);
  const upload = useMediaUpload(); const uploadItem = upload.items[0];
  const recurrence = useMemo<InvoiceRecurrence>(() => ({ start: recurrenceStart, end: recurrenceEnd, day: Number(recurrenceDay) }), [recurrenceStart, recurrenceEnd, recurrenceDay]);
  const recurrenceCount = useMemo(() => { if (!recurrenceStart || !recurrenceEnd) return 0; try { return buildRecurringDueDates(recurrence).length; } catch { return 0; } }, [recurrence, recurrenceStart, recurrenceEnd]);
  const busy = processing || submitting;

  const choose = (file?: File) => { if (!file) return; if (file.type !== 'application/pdf') return setError('O boleto deve ser um arquivo PDF.'); try { upload.clearAll(); upload.enqueue(brandId, [file], 'invoice'); upload.start(); setError(''); } catch { setError('Não foi possível preparar o PDF.'); } };
  const submit = async () => {
    if (submittingRef.current) return;
    const numeric = Number(amount.replace(',', '.'));
    if (!brandId || !description.trim() || !Number.isFinite(numeric) || numeric <= 0) return setError('Preencha cliente, descrição e um valor maior que zero.');
    if (chargeType === 'single' && !dueDate) return setError('Informe o vencimento.');
    if (chargeType === 'recurring') { try { buildRecurringDueDates(recurrence); } catch (cause) { const code = cause instanceof Error ? cause.message : ''; return setError(code === 'invalid-recurrence-range' ? 'O mês final não pode ser anterior ao inicial.' : code === 'invalid-recurrence-day' ? 'O dia deve estar entre 1 e 31.' : code === 'recurrence-too-long' ? 'A recorrência pode ter no máximo 60 meses.' : 'Informe corretamente o período da recorrência.'); } }
    if (uploadItem && uploadItem.state !== 'completed') return setError('Aguarde o envio do boleto terminar.');
    submittingRef.current = true; setSubmitting(true); setError('');
    try { await onConfirm({ brandId, description, notes: notes || undefined, amount: numeric, dueDate: chargeType === 'single' ? dueDate : '', referenceMonth: chargeType === 'single' ? referenceMonth || undefined : undefined, pixKey: pixKey || undefined, pixKeyType: pixKey ? pixKeyType : undefined, boletoUrl: boletoUrl || undefined }, chargeType === 'single' ? uploadItem?.mediaId : undefined, chargeType === 'recurring' ? recurrence : undefined); }
    catch { setError('Não foi possível salvar a cobrança.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <GlobalModal title={invoice ? 'Editar fatura' : 'Nova fatura'} size="lg" onClose={onCancel} closeOnEscape={!busy} closeOnOverlay={!busy}><div className="grid gap-4 sm:grid-cols-2">
    {!invoice && <fieldset className="sm:col-span-2"><legend className="text-sm font-bold">Tipo de cobrança</legend><div className="mt-2 flex gap-5 rounded-xl border p-4"><label><input type="radio" name="charge-type" checked={chargeType === 'single'} onChange={() => setChargeType('single')} /> <span className="font-medium">Cobrança única</span></label><label><input type="radio" name="charge-type" checked={chargeType === 'recurring'} onChange={() => { upload.clearAll(); setChargeType('recurring'); }} /> <span className="font-medium">Cobrança recorrente</span></label></div></fieldset>}
    <Field label="Cliente"><select aria-label="Cliente" value={brandId} disabled={Boolean(invoice) || busy} onChange={event => setBrandId(event.target.value)} className="input"><option value="">Selecione</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>
    <Field label="Descrição"><input aria-label="Descrição" value={description} onChange={event => setDescription(event.target.value)} disabled={busy} className="input" /></Field>
    <Field label="Valor"><input aria-label="Valor" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} className="input" /></Field>
    {chargeType === 'single' ? <><Field label="Vencimento"><input aria-label="Vencimento" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={busy} className="input" /></Field><Field label="Competência opcional"><input aria-label="Competência opcional" type="month" value={referenceMonth} onChange={event => setReferenceMonth(event.target.value)} disabled={busy} className="input" /></Field></> : <><Field label="Mês/ano inicial"><input aria-label="Mês/ano inicial" type="month" value={recurrenceStart} onChange={event => setRecurrenceStart(event.target.value as YearMonth)} disabled={busy} className="input" /></Field><Field label="Mês/ano final"><input aria-label="Mês/ano final" type="month" value={recurrenceEnd} onChange={event => setRecurrenceEnd(event.target.value as YearMonth)} disabled={busy} className="input" /></Field><Field label="Dia do vencimento"><input aria-label="Dia do vencimento" type="number" min={1} max={31} value={recurrenceDay} onChange={event => setRecurrenceDay(event.target.value)} disabled={busy} className="input" /></Field><p className="self-end rounded-xl bg-zinc-50 p-3 text-sm font-medium">{recurrenceCount ? `Serão criadas ${recurrenceCount} cobranças.` : 'Informe o período para calcular a série.'}</p></>}
    <Field label="Tipo da chave Pix"><select aria-label="Tipo da chave Pix" value={pixKeyType} onChange={event => setPixKeyType(event.target.value as PixKeyType)} disabled={busy} className="input"><option value="random">Aleatória</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option></select></Field>
    <Field label="Chave Pix específica"><input aria-label="Chave Pix" value={pixKey} onChange={event => setPixKey(event.target.value)} disabled={busy} placeholder="Opcional; usa a chave da agência" className="input" /></Field>
    <Field label="URL do boleto"><input aria-label="URL do boleto" type="url" value={boletoUrl} onChange={event => setBoletoUrl(event.target.value)} disabled={busy} placeholder="https://" className="input" /></Field>
    <label className="text-sm font-bold sm:col-span-2">Observação<textarea aria-label="Observação" value={notes} onChange={event => setNotes(event.target.value)} disabled={busy} rows={3} className="mt-2 w-full rounded-xl border p-3" /></label>
    {chargeType === 'single' ? <label className="text-sm font-bold sm:col-span-2">Boleto manual em PDF<input aria-label="Boleto manual em PDF" type="file" accept="application/pdf,.pdf" disabled={!brandId || busy} onChange={event => choose(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border p-3" /></label> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">O boleto é individual. Crie a série e anexe cada PDF na cobrança correspondente.</p>}
    {uploadItem && <div className="rounded-xl bg-zinc-50 p-3 text-sm sm:col-span-2"><p>{uploadItem.file.name}: {uploadItem.state} ({uploadItem.progress.percentage}%)</p></div>}
    {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    <div className="flex justify-end gap-3 sm:col-span-2"><button disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border px-5 font-bold">Cancelar</button><button disabled={busy || upload.isUploading} onClick={() => void submit()} className="min-h-11 rounded-xl bg-black px-5 font-bold text-white">{busy ? 'Salvando...' : chargeType === 'recurring' ? 'Criar série' : 'Salvar'}</button></div>
  </div></GlobalModal>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-bold">{label}{children}</label>; }
