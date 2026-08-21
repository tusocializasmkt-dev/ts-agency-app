import { useState } from 'react';
import GlobalModal from './ui/GlobalModal';
import { MediaPicker } from './media';

type MetricKind = 'organic' | 'paid';
const numericFields: Record<MetricKind, ReadonlyArray<readonly [string, string]>> = {
  organic: [['followers', 'Seguidores'], ['reach', 'Alcance'], ['impressions', 'Impressões'], ['engagement', 'Engajamento (%)']],
  paid: [['investment', 'Investimento'], ['reach', 'Alcance'], ['impressions', 'Impressões'], ['clicks', 'Cliques'], ['leads', 'Leads'], ['conversions', 'Conversões'], ['revenue', 'Receita']],
};

export default function MetricsDialog({ kind, brandId, processing, onClose, onSave }: { kind: MetricKind; brandId: string; processing: boolean; onClose: () => void; onSave: (data: Record<string, number | string | string[]>) => Promise<void> }) {
  const [month, setMonth] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]); const [picker, setPicker] = useState(false);
  const submit = async () => {
    const converted = Object.fromEntries(numericFields[kind].map(([key]) => [key, Number(values[key] || 0)]));
    if (!month || Object.values(converted).some(value => !Number.isFinite(value) || value < 0)) return setError('Informe uma competência e valores válidos.');
    try { await onSave({ month, ...converted, screenshotMediaIds: screenshots }); } catch { setError('Não foi possível salvar as métricas.'); }
  };
  return <GlobalModal title={kind === 'organic' ? 'Métricas orgânicas' : 'Métricas de tráfego pago'} onClose={onClose} closeOnEscape={!processing} closeOnOverlay={!processing}><div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold sm:col-span-2">Competência<input aria-label="Competência" type="month" value={month} onChange={event => setMonth(event.target.value)} className="mt-2 min-h-11 w-full border p-3" /></label>
    {numericFields[kind].map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input aria-label={label} inputMode="decimal" value={values[key] || ''} onChange={event => setValues(current => ({ ...current, [key]: event.target.value.replace(',', '.') }))} className="mt-2 min-h-11 w-full border p-3" /></label>)}
    <div className="sm:col-span-2"><button type="button" onClick={() => setPicker(true)} className="min-h-11 rounded-xl border px-4 font-bold">Anexar prints</button><span className="ml-3 text-sm text-zinc-500">{screenshots.length} anexo(s)</span></div>
    {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    <div className="flex justify-end gap-3 sm:col-span-2"><button disabled={processing} onClick={onClose} className="min-h-11 border px-5 font-bold">Cancelar</button><button disabled={processing} onClick={() => void submit()} className="min-h-11 bg-black px-5 font-bold text-white">{processing ? 'Salvando...' : 'Salvar competência'}</button></div>
  </div>{picker && <MediaPicker brandId={brandId} selectedIds={screenshots} onConfirm={ids => { setScreenshots(ids); setPicker(false); }} onCancel={() => setPicker(false)} />}</GlobalModal>;
}
