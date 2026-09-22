import { useState, type FormEvent } from 'react';
import GlobalModal from '../ui/GlobalModal';
import PasswordInput from './PasswordInput';
import { accessErrorMessage } from '../../services/access-error';
import type { AccessProfile } from '../../data/functions/access.functions';

export default function AccessEditor({ profile, creating, processing, onClose, onSave }: { profile?: AccessProfile; creating?: boolean; processing: boolean; onClose: () => void; onSave: (data: { email: string; displayName: string; password?: string }) => Promise<void> }) {
  const [email, setEmail] = useState(profile?.email ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (creating && (password.length < 10 || password !== confirmation)) { setError('Use senhas iguais com pelo menos 10 caracteres.'); return; }
    setError('');
    try { await onSave({ email, displayName, ...(creating ? { password } : {}) }); }
    catch (cause) { setError(accessErrorMessage(cause)); }
  };
  return <GlobalModal title={creating ? 'Criar acesso' : 'Editar acesso'} onClose={onClose} closeOnEscape={!processing} closeOnOverlay={!processing}><form onSubmit={submit} className="space-y-4"><label className="block font-bold">Nome<input required maxLength={100} disabled={processing} value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" /></label><label className="block font-bold">E-mail de acesso<input type="email" required disabled={processing} value={email} onChange={e => setEmail(e.target.value)} className="input" /></label>{creating && <><label className="block font-bold">Senha inicial<PasswordInput required minLength={10} maxLength={128} autoComplete="new-password" disabled={processing} value={password} onChange={e => setPassword(e.target.value)} className="input" /></label><label className="block font-bold">Confirmar senha<PasswordInput required autoComplete="new-password" disabled={processing} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="input" /></label></>}{error && <p role="alert" className="text-red-600">{error}</p>}<p className="text-sm text-zinc-500">Confirme os dados antes de salvar. Alterações de credenciais encerram sessões anteriores.</p><div className="flex justify-end gap-3"><button type="button" disabled={processing} onClick={onClose} className="min-h-11 rounded-xl border px-4">Cancelar</button><button disabled={processing} className="min-h-11 rounded-xl bg-black px-4 text-white">Confirmar e salvar</button></div></form></GlobalModal>;
}
