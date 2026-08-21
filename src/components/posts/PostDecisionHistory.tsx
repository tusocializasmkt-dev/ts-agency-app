import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePostDecisionHistory } from '../../hooks/usePostDecisionHistory';

const labels = { approved: 'Aprovado', rejected: 'Reprovado', changes_requested: 'Ajustes solicitados', resubmitted: 'Reenviado para aprovação' } as const;
export default function PostDecisionHistory({ postId }: { postId: string }) {
  const [expanded, setExpanded] = useState(false); const { history, loading, error } = usePostDecisionHistory(postId, expanded);
  return <section className="border-t border-zinc-100 pt-3"><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="flex min-h-10 w-full items-center justify-between text-left text-xs font-bold text-zinc-600"><span>Histórico de aprovação</span>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{expanded && <div className="mt-2 space-y-3">{loading ? <p className="text-xs text-zinc-500">Carregando histórico...</p> : error ? <p className="text-xs text-red-600" role="alert">{error}</p> : history.length ? history.map(entry => <article key={entry.id} className="rounded-xl bg-zinc-50 p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>{labels[entry.action]}</strong><time className="text-zinc-500">{entry.createdAt?.toLocaleString('pt-BR') ?? 'Data indisponível'}</time></div><p className="mt-1 text-zinc-500">{entry.actorRole === 'admin' ? 'Admin' : 'Cliente'} · {entry.newStatus}</p>{entry.feedback && <p className="mt-2 whitespace-pre-wrap text-zinc-700">{entry.feedback}</p>}</article>) : <p className="text-xs text-zinc-500">Nenhum histórico de aprovação disponível.</p>}</div>}</section>;
}
