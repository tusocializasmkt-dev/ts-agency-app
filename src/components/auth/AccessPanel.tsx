import { useState } from 'react';
import { useAccessManagement } from '../../hooks/useAccessManagement';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../hooks/useModal';
import { useFeedback } from '../../hooks/useFeedback';
import { callCreateClientAccess } from '../../data/functions/auth.functions';
import type { AccessKind, AccessProfile } from '../../data/functions/access.functions';
import AccessEditor from './AccessEditor';
import PasswordDialog from './PasswordDialog';

export default function AccessPanel({ kind, uid }: { kind: AccessKind; uid?: string }) {
  const { user, isAdmin } = useAuth();
  const { profiles, loading, error, processing, run, refresh } = useAccessManagement(kind, uid);
  const { confirm } = useModal();
  const feedback = useFeedback();
  const [editing, setEditing] = useState<AccessProfile | null | undefined>();
  const [passwordFor, setPasswordFor] = useState<AccessProfile>();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;
  const status = async (profile: AccessProfile, remove = false) => {
    if (!await confirm({ title: remove ? 'Remover acesso?' : profile.active ? 'Desativar acesso?' : 'Ativar acesso?', description: kind === 'client' ? 'Somente o login será alterado. A empresa, conteúdos, mídias e histórico serão preservados.' : 'Confirme a alteração de acesso deste usuário.', confirmLabel: 'Confirmar', destructive: remove || profile.active })) return;
    try { await run({ uid: profile.uid, action: remove ? 'remove' : 'status', active: !profile.active }); feedback.success('Acesso atualizado.'); }
    catch { feedback.error('Não foi possível alterar o acesso. Atualize a lista e tente novamente.'); }
  };
  return <section className="space-y-4 rounded-2xl border bg-white p-5 text-black"><h2 className="text-xl font-bold">{kind === 'admin' ? 'Administradores' : 'Acesso do cliente'}</h2>{loading ? <p>Carregando acessos...</p> : error ? <p role="alert">{error}<button onClick={() => void refresh()} className="ml-3 underline">Tentar novamente</button></p> : <div className="space-y-4">{profiles.map(profile => <div key={profile.uid} className="rounded-xl border p-4"><p className="break-words font-bold">{profile.displayName || 'Acesso não criado'}</p><p className="break-all text-sm">{profile.email}</p><p className="text-sm">{!profile.exists ? 'Sem login' : profile.active ? 'Ativo' : 'Inativo'}</p><div className="mt-3 flex flex-wrap gap-3">{profile.exists ? <><button disabled={processing} className="min-h-11 underline" onClick={() => { setCreating(false); setEditing(profile); }}>Editar acesso</button><button disabled={processing} className="min-h-11 underline" onClick={() => setPasswordFor(profile)}>Redefinir senha</button><button disabled={processing || profile.uid === user?.uid} className="min-h-11 underline disabled:opacity-40" onClick={() => void status(profile)}>{profile.active ? 'Desativar' : 'Ativar'}</button><button disabled={processing || profile.uid === user?.uid} className="min-h-11 text-red-600 underline disabled:opacity-40" onClick={() => void status(profile, true)}>Remover login</button></> : kind === 'client' && <button className="min-h-11 underline" onClick={() => { setCreating(true); setEditing(profile); }}>Criar acesso</button>}</div></div>)}</div>}{kind === 'admin' && <button className="min-h-11 rounded-xl bg-black px-5 text-white" onClick={() => { setCreating(true); setEditing(null); }}>Novo administrador</button>}{editing !== undefined && <AccessEditor profile={editing ?? undefined} creating={creating} processing={processing || busy} onClose={() => setEditing(undefined)} onSave={async data => { if (kind === 'client' && creating) { setBusy(true); try { await callCreateClientAccess({ brandId: uid!, email: data.email, password: data.password!, active: true }); await run({ action: 'update', email: data.email, displayName: data.displayName }); } finally { setBusy(false); } } else await run({ action: creating ? 'create' : 'update', uid: editing?.uid, ...data }); setEditing(undefined); feedback.success('Acesso salvo.'); }} />}{passwordFor && <PasswordDialog title={`Redefinir senha de ${passwordFor.displayName}`} processing={processing} onClose={() => setPasswordFor(undefined)} onConfirm={async password => { await run({ action: 'password', uid: passwordFor.uid, password }); setPasswordFor(undefined); feedback.success('Senha redefinida.'); }} />}</section>;
}
