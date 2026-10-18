import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { useAppearance } from './AppearanceProvider';
import { defaultAppearance, desktopSidebarVariables, foreground, getDesktopBackground, opaqueColor, surfaceStyle, type Appearance, type Surface } from './theme';
import { saveAppearance, uploadBackground, watchDesigns } from './appearance.service';
import { useEditorPermission } from './useEditorPermission';
import ColorWheel from './ColorWheel';
import SidebarBackgroundEditor from './SidebarBackgroundEditor';

export default function AppearanceEditor() {
  const applied = useAppearance();
  const allowed = useEditorPermission('appearanceEditor');
  const [draft, setDraftState] = useState(applied);
  const dirty = useRef(false);
  const setDraft = (next: SetStateAction<Appearance>) => { dirty.current = true; setDraftState(next); };
  useEffect(() => { if (!dirty.current) setDraftState(applied); }, [applied]);
  const [designId, setDesignId] = useState<string | undefined>();
  const [designs, setDesigns] = useState<{ id: string; theme: Appearance }[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (allowed) return watchDesigns(setDesigns, () => setMessage('Não foi possível carregar as combinações.')); }, [allowed]);
  const run = async (action: () => Promise<void>, success: string) => { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); try { await action(); setMessage(success); } catch (error) { setMessage(error instanceof Error && error.message.startsWith('Use ') ? error.message : 'Não foi possível concluir. Verifique a conexão e sua permissão.'); } finally { lock.current = false; setBusy(false); } };
  const surface = (key: 'sidebar' | 'header', patch: Partial<Surface>) => setDraft(t => ({ ...t, [key]: { ...t[key], ...patch } }));
  return <section className="my-8 max-w-4xl space-y-5 rounded-3xl border bg-white p-5 sm:p-8" aria-labelledby="appearance-title"><h2 id="appearance-title" className="text-2xl font-bold">Aparência e Personalização</h2>
    {!allowed ? <p>A edição exige a permissão administrativa de aparência.</p> : <>
      <p className="text-sm text-zinc-600">Crie combinações próprias. A prévia abaixo é local; aplicar atualiza todos os acessos. O cabeçalho aparece no celular. Não há rodapé global.</p>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <label className="block">Nome da combinação<input className="input" maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label className="block">Combinações salvas<select className="input" value={designId || ''} onChange={e => { const item = designs.find(d => d.id === e.target.value); setDesignId(item?.id); if (item) setDraft(item.theme); }}><option value="">Nova combinação…</option>{designs.map(d => <option key={d.id} value={d.id}>{d.theme.name}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2">{(['sidebar', 'header'] as const).map(key => <div key={key} className="space-y-3">
          <ColorWheel label={key === 'sidebar' ? 'Menu lateral' : 'Cabeçalho'} value={draft[key].color} onChange={color => surface(key, { color })} />
          {key === 'sidebar' ? <SidebarBackgroundEditor value={getDesktopBackground(draft.sidebar)} onChange={desktopBackground => setDraft(t => ({ ...t, sidebar: { ...t.sidebar, desktopBackground } }))} onUpload={file => void run(async () => { const image = await uploadBackground(file); setDraft(t => ({ ...t, sidebar: { ...t.sidebar, desktopBackground: { ...getDesktopBackground(t.sidebar), image } } })); }, 'Imagem enviada para a prévia desktop. Salve ou aplique a combinação.')} /> : <>
          <label className="block text-sm">Imagem de fundo — cabeçalho<input className="block w-full py-3" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { const image = await uploadBackground(file); surface(key, { image }); }, 'Imagem enviada para a prévia. Salve ou aplique a combinação.'); }} /></label>
          {draft[key].image && <><img src={draft[key].image} alt="Fundo do cabeçalho" className="h-24 w-full rounded-lg object-contain" /><button type="button" className="min-h-11 underline" onClick={() => surface(key, { image: '' })}>Remover imagem da combinação</button></>}
          {(['position', 'scale', 'overlay'] as const).map((control, index) => <label key={control} className="block text-sm">{['Posição vertical', 'Escala', 'Sobreposição para legibilidade'][index]}: {draft[key][control]}%<input className="block min-h-9 w-full" type="range" min={control === 'scale' ? 100 : control === 'overlay' ? 75 : 0} max={control === 'scale' ? 200 : 100} value={draft[key][control]} onChange={e => surface(key, { [control]: Number(e.target.value) })} /></label>)}
          </>}
        </div>)}</div>
        <div className="grid gap-4 sm:grid-cols-3">{(['accent', 'dashboard', 'feed'] as const).map((key, i) => <ColorWheel key={key} label={['Destaque interativo', 'Detalhes do Dashboard', 'Detalhes do Feed'][i]} value={draft[key]} onChange={color => setDraft({ ...draft, [key]: color })} />)}</div>
        <div aria-label="Prévia da aparência" className="overflow-hidden rounded-xl border"><div className="p-5" style={surfaceStyle(draft.header)}>Cabeçalho · TS Agency</div><div className="flex min-h-48"><div className="appearance-desktop-sidebar-preview w-1/3 p-4" style={desktopSidebarVariables(draft.sidebar)}>Menu lateral<br />Dashboard<br />Feed</div><div className="flex-1 space-y-4 bg-white p-4 text-black"><div className="rounded-lg border-t-4 p-3" style={{ borderColor: opaqueColor(draft.dashboard) }}>Dashboard</div><div className="rounded-lg border-t-4 p-3" style={{ borderColor: opaqueColor(draft.feed) }}>Feed</div><button type="button" className="min-h-11 rounded-lg px-4" style={{ background: opaqueColor(draft.accent), color: foreground(draft.accent) }}>Botão de destaque</button></div></div></div>
        <div className="flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => void run(async () => { const id = designId || crypto.randomUUID(); await saveAppearance(draft, id); setDesignId(id); }, 'Combinação salva na biblioteca.')}>Salvar combinação</button><button type="button" className="min-h-11 rounded-xl bg-black px-4 text-white" onClick={() => void run(() => saveAppearance(draft), 'Aparência global aplicada.')}>Aplicar globalmente</button><button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => { setDraft(applied); setDesignId(undefined); }}>Descartar prévia</button><button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => { setDraft(defaultAppearance); setDesignId(undefined); }}>Carregar original</button></div>
      </fieldset>
    </>}
    <p role="status" className="text-sm">{busy ? 'Processando…' : message}</p>
  </section>;
}
