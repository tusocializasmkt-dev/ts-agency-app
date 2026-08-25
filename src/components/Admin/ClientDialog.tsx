import { useState, type FormEvent } from 'react';
import type { Brand, BrandStatus } from '../../types';
import { BRAND_STATUSES, BRAND_STATUS_LABELS } from '../../brands/brand-status';
import GlobalModal from '../ui/GlobalModal';

export interface NewClientInput { brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>; createAccess: boolean; accessEmail?: string; password?: string; }

export default function ClientDialog({ processing, onClose, onSave }: { processing: boolean; onClose: () => void; onSave: (data: NewClientInput) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', responsible: '', email: '', phone: '', cnpj: '', website: '', internalNotes: '' });
  const [status, setStatus] = useState<BrandStatus>('active');
  const [createAccess, setCreateAccess] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const field = (key: keyof typeof form, label: string, type = 'text') => <label className="text-sm font-bold">{label}<input aria-label={label} type={type} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label>;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Informe o nome do cliente.');
    if (createAccess && (!accessEmail.trim() || password.length < 6 || password !== confirmation)) return setError('Confira o e-mail e a confirmação da senha com ao menos 6 caracteres.');
    setError('');
    try { await onSave({ brand: { ...form, name: form.name.trim(), status, login: form.email.trim().toLowerCase(), socialLinks: {} }, createAccess, ...(createAccess ? { accessEmail: accessEmail.trim().toLowerCase(), password } : {}) }); }
    catch { setError('Não foi possível criar o cliente.'); }
  };
  return <GlobalModal title="Novo cliente" onClose={onClose} closeOnEscape={!processing} closeOnOverlay={!processing}><form onSubmit={submit} className="space-y-6"><section><h3 className="mb-4 font-bold">Dados básicos</h3><div className="grid gap-4 sm:grid-cols-2">{field('name','Nome da empresa / marca')}{field('responsible','Nome do responsável')}{field('email','E-mail principal','email')}{field('phone','Telefone / WhatsApp')}{field('cnpj','CNPJ')}{field('website','Website')}<label className="text-sm font-bold">Status do cliente<select aria-label="Status do cliente" value={status} onChange={event => setStatus(event.target.value as BrandStatus)} className="mt-2 min-h-11 w-full rounded-xl border p-3">{BRAND_STATUSES.map(value => <option key={value} value={value}>{BRAND_STATUS_LABELS[value]}</option>)}</select></label>{field('internalNotes','Observações internas')}</div></section><section className="rounded-xl border p-4"><label className="flex min-h-11 items-center gap-3 font-bold"><input type="checkbox" checked={createAccess} onChange={event => { setCreateAccess(event.target.checked); if (event.target.checked && !accessEmail) setAccessEmail(form.email); }} />Criar acesso ao portal para este cliente</label>{createAccess && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold sm:col-span-2">E-mail de acesso<input aria-label="E-mail de acesso" type="email" value={accessEmail} onChange={event => setAccessEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label><label className="text-sm font-bold">Senha inicial<input aria-label="Senha inicial" type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label><label className="text-sm font-bold">Confirmar senha<input aria-label="Confirmar senha" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border p-3" /></label></div>}</section>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} disabled={processing} className="min-h-11 rounded-xl border px-5 font-bold">Cancelar</button><button disabled={processing} className="min-h-11 rounded-xl bg-black px-5 font-bold text-white">{processing ? 'Criando...' : createAccess ? 'Criar cliente e acesso' : 'Criar cliente'}</button></div></form></GlobalModal>;
}
