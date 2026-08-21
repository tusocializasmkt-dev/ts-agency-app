import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Sparkles, TrendingUp, Target, Info, Loader2, Zap, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBrands, useFeedback, useMetrics } from '../hooks';
import MetricsDialog from './MetricsDialog';

interface InsightsViewProps {
  selectedBrandId: string | null;
  isAdmin: boolean;
  onBrandChange?: (id: string) => void;
}

const InsightsView: React.FC<InsightsViewProps> = ({ selectedBrandId, isAdmin, onBrandChange }) => {
  const metrics = useMetrics(selectedBrandId);
  const { organic, paid } = metrics;
  const { brands } = useBrands(undefined, isAdmin);
  const feedback = useFeedback();
  const [tab, setTab] = useState<'organic' | 'paid'>('organic');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);

  const generateAIAnalysis = () => {
    if (!selectedBrandId) return;
    feedback.info('Recurso de IA temporariamente indisponível durante a configuração segura.');
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: string | number; color?: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm font-bold tracking-tight" style={{ color: p.color === '#fff' ? '#000' : p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black uppercase tracking-widest">Insights</h2>
          <p className="text-zinc-400 text-sm font-medium">Acompanhamento de performance mensal.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          {isAdmin && (
            <select value={selectedBrandId || ''} onChange={event => onBrandChange?.(event.target.value)} className="bg-[#FAFAFA] border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-all">
              <option value="">Selecionar Cliente</option>
              {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          )}
          <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
          <button 
            onClick={() => setTab('organic')}
            className={cn("min-w-0 flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all sm:px-6", tab === 'organic' ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-black")}
          >
            Orgânico
          </button>
          <button 
            onClick={() => setTab('paid')}
            className={cn("min-w-0 flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all sm:px-6", tab === 'paid' ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-black")}
          >
            Tráfego Pago
          </button>
          </div>
          {isAdmin && <button disabled={!selectedBrandId} onClick={() => setEditingMetrics(true)} className="min-h-11 bg-black px-4 text-sm font-bold text-white disabled:opacity-40">Adicionar métricas</button>}
        </div>
      </div>

      {!selectedBrandId && (
        <div className="text-center p-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
          <p className="text-zinc-400 font-medium font-mono uppercase text-xs tracking-widest">Selecione um cliente para visualizar métricas.</p>
        </div>
      )}
      {editingMetrics && selectedBrandId && <MetricsDialog kind={tab} brandId={selectedBrandId} processing={savingMetrics} onClose={() => setEditingMetrics(false)} onSave={async data => { setSavingMetrics(true); try { const screenshotMediaIds = data.screenshotMediaIds as string[]; if (tab === 'organic') await metrics.saveOrganic({ brandId: selectedBrandId, month: String(data.month), followers: Number(data.followers), engagement: Number(data.engagement), reach: Number(data.reach), impressions: Number(data.impressions), screenshotMediaIds }); else await metrics.savePaid({ brandId: selectedBrandId, month: String(data.month), investment: Number(data.investment), reach: Number(data.reach), impressions: Number(data.impressions), clicks: Number(data.clicks), leads: Number(data.leads), conversions: Number(data.conversions), revenue: Number(data.revenue), screenshotMediaIds }); feedback.success('Métricas salvas.'); setEditingMetrics(false); } finally { setSavingMetrics(false); } }} />}

      {selectedBrandId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-zinc-200 rounded-3xl p-8 h-[450px] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-8 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Desempenho Mensal
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                {tab === 'organic' ? (
                  <LineChart data={organic}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => v.split('-')[1]} />
                    <YAxis stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="followers" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} name="Seguidores" />
                    <Line type="monotone" dataKey="reach" stroke="#999" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#999' }} name="Alcance" />
                  </LineChart>
                ) : (
                  <BarChart data={paid}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="conversions" fill="#000" radius={[4, 4, 0, 0]} name="Conversões" />
                    <Bar dataKey="clicks" fill="#ccc" radius={[4, 4, 0, 0]} name="Cliques" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {tab === 'organic' ? (
                <>
                  <StatCard label="Seguidores" value={organic.slice(-1)[0]?.followers || 0} />
                  <StatCard label="Alcance" value={organic.slice(-1)[0]?.reach || 0} />
                  <StatCard label="Impressões" value={organic.slice(-1)[0]?.impressions || 0} />
                  <StatCard label="Engajamento" value={`${organic.slice(-1)[0]?.engagement || 0}%`} />
                </>
              ) : (
                <>
                  <StatCard label="Investido" value={`R$ ${paid.slice(-1)[0]?.investment?.toLocaleString() || 0}`} />
                  <StatCard label="CTR" value={`${paid.slice(-1)[0]?.ctr || 0}%`} />
                  <StatCard label="CPC" value={`R$ ${paid.slice(-1)[0]?.cpc || 0}`} />
                  <StatCard label="Conversões" value={paid.slice(-1)[0]?.conversions || 0} />
                </>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {isAdmin && (
              <div className="bg-black text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
                      <Sparkles className="w-5 h-5" /> Análise IA
                    </h3>
                  </div>
                  {aiInsight ? (
                    <div className="text-sm font-medium leading-relaxed italic border-l-2 border-white/20 pl-4 py-2">
                      {aiInsight}
                    </div>
                  ) : (
                    <p className="text-xs font-medium opacity-60">Gere uma análise automática do desempenho deste cliente com base nos dados mais recentes.</p>
                  )}
                  <button 
                    onClick={generateAIAnalysis}
                    disabled={generatingAi}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-xl"
                  >
                    {generatingAi ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sugerir Melhorias'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                <Target className="w-4 h-4" /> Melhor Conteúdo
              </h3>
              <div className="space-y-4">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex gap-4 items-center group cursor-pointer hover:border-black transition-all">
                  <div className="w-14 h-14 bg-zinc-200 rounded-xl flex-shrink-0 group-hover:bg-black transition-colors"></div>
                  <div>
                    <p className="text-sm font-bold truncate">Reels: Lançamento de Inverno</p>
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-1">+24% engajamento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value }: { label: string, value: string | number }) => (
  <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-sm hover:border-black transition-all group">
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
    <p className="text-2xl font-bold tracking-tighter text-black group-hover:translate-x-1 transition-transform">{value}</p>
  </div>
);

export default InsightsView;
