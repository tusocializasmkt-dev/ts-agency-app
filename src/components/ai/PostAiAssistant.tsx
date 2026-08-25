import { useState } from 'react';
import { Check, Clipboard, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useMarketingAI } from '../../hooks/useMarketingAI';
import type { MarketingAiAction } from '../../data/functions/marketing-ai.functions';

const actions: Array<[MarketingAiAction, string]> = [
  ['generate_caption', 'Gerar legenda'], ['improve_caption', 'Melhorar'], ['generate_headline', 'Headlines'],
  ['generate_cta', 'CTAs'], ['professional_tone', 'Tom profissional'], ['casual_tone', 'Tom casual'],
  ['summarize', 'Resumir'], ['generate_variations', 'Variações'], ['generate_hashtags', 'Hashtags'],
];

export default function PostAiAssistant({ brandId, content, platform, objective, onUse }: { brandId: string; content: string; platform?: string; objective?: string; onUse: (text: string) => void }) {
  const ai = useMarketingAI();
  const [lastAction, setLastAction] = useState<MarketingAiAction>('generate_caption');
  const request = (action: MarketingAiAction) => { setLastAction(action); return ai.run({ action, brandId, content, platform, objective }); };
  return <section aria-label="Assistente de IA" className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
    <div className="mb-3 flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-violet-600" />Assistente de conteúdo</div>
    <div className="flex flex-wrap gap-2">{actions.map(([action, label]) => <button key={action} type="button" disabled={!brandId || ai.loading || (action !== 'generate_caption' && !content.trim())} onClick={() => void request(action)} className="min-h-10 rounded-xl border bg-white px-3 text-xs font-bold disabled:opacity-40">{label}</button>)}</div>
    {ai.loading && <div role="status" className="mt-4 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Gerando sugestão...<button type="button" onClick={ai.cancel} className="ml-auto text-xs font-bold">Cancelar</button></div>}
    {ai.error && <div role="alert" className="mt-4 text-sm font-bold text-red-600">{ai.error} <button type="button" onClick={ai.clear} className="ml-2 underline">Fechar</button></div>}
    {ai.result && <div className="mt-4 rounded-xl border bg-white p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-600">Sugestão da IA</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{ai.result}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onUse(ai.result!)} className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white"><Check className="mr-1 inline h-3 w-3" />Usar esta versão</button><button type="button" onClick={() => void request(lastAction)} className="rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw className="mr-1 inline h-3 w-3" />Tentar novamente</button><button type="button" onClick={() => void navigator.clipboard?.writeText(ai.result!)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Clipboard className="mr-1 inline h-3 w-3" />Copiar</button><button type="button" onClick={ai.clear} className="rounded-lg px-3 py-2 text-xs font-bold"><X className="mr-1 inline h-3 w-3" />Cancelar</button></div></div>}
  </section>;
}
