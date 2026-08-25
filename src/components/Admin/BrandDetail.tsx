import React, { useState, useEffect, useRef } from 'react';
import { Brand } from '../../types';
import { Save, Link2, Building, Key, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBrands, useFeedback } from '../../hooks';
import { callCreateClientAccess, callResetClientPassword, callSetClientAccessStatus } from '../../data/functions';
import PasswordDialog from '../auth/PasswordDialog';
import AccessConfirmationDialog, { type TemporaryAccess } from './AccessConfirmationDialog';
import { APP_URL } from '../../config/app';
import { BRAND_STATUSES, BRAND_STATUS_LABELS, getBrandStatusBadgeClass, getBrandStatusRingClass } from '../../brands/brand-status';
import { createStorageReference, getFileDownloadUrl, uploadFile } from '../../data/repositories';

interface BrandDetailProps {
  brandId: string;
}

const BrandDetail: React.FC<BrandDetailProps> = ({ brandId }) => {
  const [data, setData] = useState<Partial<Brand>>({});
  const { brand, loading, error, update } = useBrands(brandId);
  const feedback = useFeedback();
  const [passwordMode, setPasswordMode] = useState<'create' | 'reset' | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccess | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (brand) setData(brand);
  }, [brand]);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const handleSave = async () => {
    try {
      await update(brandId, data);
      feedback.success('Cliente atualizado!');
    } catch (e) { feedback.error('Erro ao atualizar'); }
  };

  const handleLogoChange = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      feedback.error('Selecione uma imagem de até 5 MB.');
      return;
    }
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    setUploadingLogo(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'image';
      const reference = createStorageReference(`brands/${brandId}/media/logos/logo-${Date.now()}.${extension}`);
      const uploaded = await uploadFile(reference, file).completion;
      const logoUrl = await getFileDownloadUrl(uploaded);
      await update(brandId, { logoUrl });
      setData(current => ({ ...current, logoUrl }));
      setLogoPreview(null);
      feedback.success('Logotipo atualizado!');
    } catch {
      feedback.error('Não foi possível enviar o logotipo. O anterior foi mantido.');
    } finally {
      setUploadingLogo(false);
      if (logoInput.current) logoInput.current.value = '';
    }
  };

  if (loading) return <div className="p-20 text-center text-zinc-400 font-mono">Processando dados do cliente...</div>;
  if (error || !brand) return <div className="p-20 text-center text-red-500">{error || 'Cliente não encontrado.'}</div>;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => logoInput.current?.click()} disabled={uploadingLogo} aria-label="Alterar logotipo" className={cn("relative w-16 h-16 bg-black text-white rounded-2xl flex shrink-0 items-center justify-center overflow-hidden font-bold text-3xl shadow-xl shadow-black/10 ring-4 ring-offset-4 transition-opacity", getBrandStatusRingClass(data.status), uploadingLogo && "opacity-60")}>
            {(logoPreview || data.logoUrl) ? <img src={logoPreview || data.logoUrl} alt={`Logotipo de ${data.name || 'cliente'}`} className="h-full w-full object-cover" /> : data.name?.charAt(0).toUpperCase()}
            {uploadingLogo && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] uppercase tracking-wider">Enviando</span>}
          </button>
          <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={event => void handleLogoChange(event.target.files?.[0])} />
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{data.name}</h2>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em]">{brandId}</p>
            <button type="button" disabled={uploadingLogo} onClick={() => logoInput.current?.click()} className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black"><Upload className="mr-1 inline h-3 w-3" />{uploadingLogo ? 'Enviando...' : 'Alterar logotipo'}</button>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="bg-black text-white px-8 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-black/5"
        >
          <Save className="w-5 h-5" /> Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2 italic">
               <Building className="w-4 h-4" /> Informações Corporativas
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Nome da Marca" value={data.name || ''} onChange={v => setData({...data, name: v})} />
                <Input label="CNPJ" value={data.cnpj || ''} onChange={v => setData({...data, cnpj: v})} placeholder="00.000.000/0001-00" />
                <Input label="Responsável" value={data.responsible || ''} onChange={v => setData({...data, responsible: v})} />
                <Input label="E-mail de Contato" value={data.email || ''} onChange={v => setData({...data, email: v})} />
                <Input label="Telefone / WhatsApp" value={data.phone || ''} onChange={v => setData({...data, phone: v})} />
                <Input label="Website" value={data.website || ''} onChange={v => setData({...data, website: v})} />
             </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 space-y-8 shadow-sm"><h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Perfil colaborativo</h3><div className="grid grid-cols-1 gap-8 md:grid-cols-2"><Input label="Nome fantasia" value={data.tradeName || ''} onChange={v => setData({...data, tradeName: v})} /><Input label="Segmento" value={data.segment || ''} onChange={v => setData({...data, segment: v})} /><Input label="Cidade" value={data.city || ''} onChange={v => setData({...data, city: v})} /><Input label="Estado" value={data.state || ''} onChange={v => setData({...data, state: v})} /><Input label="WhatsApp" value={data.whatsapp || ''} onChange={v => setData({...data, whatsapp: v})} /><Input label="Público-alvo" value={data.targetAudience || ''} onChange={v => setData({...data, targetAudience: v})} /><Input label="Produtos e serviços" value={data.mainOffers || ''} onChange={v => setData({...data, mainOffers: v})} /><Input label="Tom de comunicação" value={data.communicationTone || ''} onChange={v => setData({...data, communicationTone: v})} /><Input label="Descrição" value={data.description || ''} onChange={v => setData({...data, description: v})} /><Input label="Cores da marca" value={data.brandColors || ''} onChange={v => setData({...data, brandColors: v})} /><Input label="Identidade" value={data.identityNotes || ''} onChange={v => setData({...data, identityNotes: v})} /><Input label="Observações de conteúdo" value={data.contentNotes || ''} onChange={v => setData({...data, contentNotes: v})} /><Input label="Termos a evitar" value={data.avoidedTerms || ''} onChange={v => setData({...data, avoidedTerms: v})} /><Input label="Referências" value={data.references || ''} onChange={v => setData({...data, references: v})} />{['instagram','facebook','tiktok','linkedin','youtube'].map(network => <Input key={network} label={network} value={data.socialLinks?.[network] || ''} onChange={v => setData({...data, socialLinks: {...data.socialLinks, [network]: v}})} />)}</div></div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-[2.5rem] p-10 space-y-4"><h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Somente administração</h3><Input label="Observações internas" value={data.internalNotes || ''} onChange={v => setData({...data, internalNotes: v})} /></div>

          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2 italic">
               <Link2 className="w-4 h-4 text-zinc-300" /> Links Estratégicos
             </h3>
             <div className="grid grid-cols-1 gap-8">
                <Input label="Pasta Google Drive" value={data.driveUrl || ''} onChange={v => setData({...data, driveUrl: v})} placeholder="https://drive.google.com/..." />
                <Input label="Link do Contrato" value={data.contractUrl || ''} onChange={v => setData({...data, contractUrl: v})} placeholder="https://..." />
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-zinc-50 border border-zinc-200 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-6 italic">Status do Cliente</h3>
              <div className="flex flex-col gap-4">
                 {BRAND_STATUSES.map(s => (
                   <button 
                    key={s}
                    onClick={() => setData({...data, status: s as Brand['status']})}
                    className={cn(
                      "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all shadow-sm",
                      data.status === s
                        ? getBrandStatusBadgeClass(s)
                        : "bg-white text-zinc-400 border-zinc-200 hover:border-black hover:text-black"
                    )}
                   >
                     {BRAND_STATUS_LABELS[s]}
                   </button>
                 ))}
              </div>
           </div>

           <div className="bg-black text-white border border-black rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">
                <Key className="w-4 h-4" /> Acesso do Cliente
              </h3>
              <div className="space-y-4">
                <p className="text-[11px] text-zinc-500 italic leading-relaxed">Este cliente acessa a plataforma usando as credenciais abaixo.</p>
                <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl space-y-2">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                     <span>Login</span>
                     <span className="text-white">{data.email}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                     <span>Status</span>
                     <span className="text-white uppercase">{data.accessEnabled ? 'ativo' : 'não criado ou inativo'}</span>
                   </div>
                </div>
                <button onClick={() => setPasswordMode(data.accessEnabled === undefined ? 'create' : 'reset')} className="w-full bg-white text-black py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg">{data.accessEnabled === undefined ? 'Criar acesso' : 'Redefinir senha'}</button>
                {data.accessEnabled !== undefined && <button onClick={async () => { const active = !data.accessEnabled; await callSetClientAccessStatus(brandId, active); setData(current => ({ ...current, accessEnabled: active })); feedback.success(active ? 'Acesso reativado.' : 'Acesso suspenso.'); }} className="w-full border border-zinc-700 py-4 text-xs font-bold uppercase tracking-widest">{data.accessEnabled ? 'Suspender acesso' : 'Reativar acesso'}</button>}
              </div>
           </div>
        </div>
      </div>
      {passwordMode && <PasswordDialog title={passwordMode === 'create' ? 'Criar acesso do cliente' : 'Redefinir senha do cliente'} processing={savingPassword} onClose={() => setPasswordMode(null)} onConfirm={async password => { if (!data.email) throw new Error('email-required'); setSavingPassword(true); try { if (passwordMode === 'create') { await callCreateClientAccess({ brandId, email: data.email, password, active: true }); setData(current => ({ ...current, accessEnabled: true })); } else { await callResetClientPassword(brandId, password); } feedback.success(passwordMode === 'create' ? 'Acesso do cliente criado.' : 'Senha do cliente redefinida.'); setTemporaryAccess({ name: data.name || 'Cliente', email: data.email, password, portalUrl: APP_URL }); setPasswordMode(null); } finally { setSavingPassword(false); } }} />}
      {temporaryAccess && <AccessConfirmationDialog access={temporaryAccess} onClose={() => setTemporaryAccess(null)} />}
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
  <div className="space-y-2">
    <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-[0.2em]">{label}</label>
    <input 
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-black transition-all font-medium",
        !value && "italic opacity-50"
      )}
    />
  </div>
);

export default BrandDetail;
