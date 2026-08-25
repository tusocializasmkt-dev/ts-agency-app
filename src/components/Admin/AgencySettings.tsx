import { useEffect, useRef, useState } from 'react';
import { Save, Upload, Instagram, Facebook, Linkedin, Twitter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgencyConfig, useFeedback } from '../../hooks';
import { createStorageReference, getFileDownloadUrl, uploadFile } from '../../data/repositories';

const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxLogoSize = 5 * 1024 * 1024;

export default function AgencySettings() {
  const { config, setConfig, loading, save } = useAgencyConfig(); const feedback = useFeedback();
  const [uploading, setUploading] = useState(false); const [preview, setPreview] = useState<string | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const handleSave = async () => { try { await save(config); feedback.success('Configurações salvas!'); } catch { feedback.error('Erro ao salvar'); } };
  const selectLogo = async (file?: File) => {
    if (!file) return;
    if (!allowedLogoTypes.has(file.type)) { feedback.error('Formato inválido. Use PNG, JPG, JPEG ou WEBP.'); return; }
    if (file.size > maxLogoSize) { feedback.error('O logotipo deve ter no máximo 5 MB.'); return; }
    const localPreview = URL.createObjectURL(file); setPreview(localPreview); setUploading(true);
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const reference = createStorageReference(`agency/logo/logo-${Date.now()}.${extension}`);
      const uploaded = await uploadFile(reference, file).completion; const logoUrl = await getFileDownloadUrl(uploaded);
      const next = { ...config, logoUrl }; await save(next); setConfig(next); setPreview(null); feedback.success('Logotipo da agência atualizado!');
    } catch { setPreview(null); feedback.error('Não foi possível enviar o logotipo. O anterior foi mantido.'); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  };
  if (loading) return <div className="p-20 text-center text-zinc-400">Carregando...</div>;
  return <div className="max-w-4xl space-y-8"><div className="space-y-10 rounded-[2.5rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-10">
    <div className="flex flex-col gap-4 border-b pb-10 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-3xl font-bold uppercase tracking-tighter">Configurações da Agência</h2><p className="text-sm font-medium text-zinc-400">Identidade visual e contatos oficiais do sistema.</p></div><button disabled={uploading} onClick={() => void handleSave()} className="flex items-center gap-3 rounded-2xl bg-black px-8 py-4 text-sm font-bold text-white disabled:opacity-50"><Save className="h-5 w-5" />Salvar Alterações</button></div>
    <section aria-labelledby="agency-identity" className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-6"><h3 id="agency-identity" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Identidade da Agência</h3><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border bg-white p-4 sm:w-64">{preview || config.logoUrl ? <img src={preview || config.logoUrl} alt="Logotipo atual da agência" className="max-h-full max-w-full object-contain" /> : <span className="text-xl font-bold uppercase tracking-tight">TS Agency</span>}{uploading && <span className="sr-only">Enviando logotipo</span>}</div><div><button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="min-h-11 rounded-xl border border-black bg-white px-5 text-sm font-bold disabled:opacity-50"><Upload className="mr-2 inline h-4 w-4" />{uploading ? 'Enviando...' : 'Alterar logotipo'}</button><input ref={inputRef} aria-label="Selecionar logotipo da agência" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="hidden" onChange={event => void selectLogo(event.target.files?.[0])} /><p className="mt-2 text-xs text-zinc-500">PNG, JPG ou WEBP. Máximo de 5 MB.</p></div></div></section>
    <div className="grid gap-12 md:grid-cols-2"><div className="space-y-8"><Input label="Nome da Agência" value={config.name} onChange={value => setConfig({ ...config, name: value })} /><Input label="E-mail Corporativo" value={config.email} onChange={value => setConfig({ ...config, email: value })} /><Input label="Telefone / WhatsApp" value={config.phone} onChange={value => setConfig({ ...config, phone: value })} /><Input label="Chave Pix para cobranças manuais" value={config.pixKey || ''} onChange={value => setConfig({ ...config, pixKey: value })} /></div><div className="space-y-8 rounded-[2rem] border bg-zinc-50/50 p-8"><h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Links Sociais</h3><SocialInput icon={Instagram} label="Instagram" value={config.socialLinks?.instagram || ''} onChange={value => setConfig({ ...config, socialLinks: { ...config.socialLinks, instagram: value } })} /><SocialInput icon={Facebook} label="Facebook" value={config.socialLinks?.facebook || ''} onChange={value => setConfig({ ...config, socialLinks: { ...config.socialLinks, facebook: value } })} /><SocialInput icon={Twitter} label="Twitter/X" value={config.socialLinks?.twitter || ''} onChange={value => setConfig({ ...config, socialLinks: { ...config.socialLinks, twitter: value } })} /><SocialInput icon={Linkedin} label="LinkedIn" value={config.socialLinks?.linkedin || ''} onChange={value => setConfig({ ...config, socialLinks: { ...config.socialLinks, linkedin: value } })} /></div></div>
  </div></div>;
}

const Input = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{label}<input value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border bg-zinc-50 p-4 text-sm text-black" /></label>;
const SocialInput = ({ label, value, onChange, icon: Icon }: { label: string; value: string; onChange: (value: string) => void; icon: LucideIcon }) => <div className="flex items-center gap-4"><div className="rounded-xl border bg-white p-3"><Icon className="h-4 w-4" /></div><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={label} className="min-w-0 flex-1 border-b bg-transparent p-2 text-sm" /></div>;
