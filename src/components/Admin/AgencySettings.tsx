import React from 'react';
import { AgencyConfig } from '../../types';
import { Save, Upload, Instagram, Facebook, Linkedin, Twitter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgencyConfig, useFeedback } from '../../hooks';

const AgencySettings: React.FC = () => {
  const { config, setConfig, loading, save } = useAgencyConfig();
  const feedback = useFeedback();

  const handleSave = async () => {
    try {
      await save(config);
      feedback.success('Configurações salvas!');
    } catch (e) { feedback.error('Erro ao salvar'); }
  };

  if (loading) return <div className="text-center p-20 text-zinc-400">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-5 space-y-10 shadow-sm transition-all hover:shadow-md sm:p-10">
        <div className="flex flex-col gap-4 pb-10 border-b border-zinc-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter text-black">Configurações da Agência</h2>
            <p className="text-zinc-400 text-sm font-medium">Identidade visual e contatos oficiais do sistema.</p>
          </div>
          <button 
            onClick={handleSave}
            className="bg-black text-white px-8 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-black/5"
          >
            <Save className="w-5 h-5" /> Salvar Alterações
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
               <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-2 tracking-[0.2em]">Logo da Agência (URL)</label>
               <div className="flex gap-4">
                 <input 
                  type="text" 
                  value={config.logoUrl}
                  onChange={e => setConfig({...config, logoUrl: e.target.value})}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-black transition-all"
                  placeholder="https://..."
                />
                <div className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                   {config.logoUrl ? <img src={config.logoUrl} alt="logo" className="w-full h-full object-contain" /> : <Upload className="text-zinc-300 w-6 h-6" />}
                </div>
               </div>
            </div>
            <Input label="Nome da Agência" value={config.name} onChange={v => setConfig({...config, name: v})} />
            <Input label="E-mail Corporativo" value={config.email} onChange={v => setConfig({...config, email: v})} />
            <Input label="Telefone / WhatsApp" value={config.phone} onChange={v => setConfig({...config, phone: v})} />
            <Input label="Chave Pix para cobranças manuais" value={config.pixKey || ''} onChange={v => setConfig({...config, pixKey: v})} />
          </div>

          <div className="space-y-8 bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-100">
             <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-6">Links Sociais</h3>
             <SocialInput icon={Instagram} label="Instagram" value={config.socialLinks?.instagram || ''} onChange={v => setConfig({...config, socialLinks: {...config.socialLinks, instagram: v}})} />
             <SocialInput icon={Facebook} label="Facebook" value={config.socialLinks?.facebook || ''} onChange={v => setConfig({...config, socialLinks: {...config.socialLinks, facebook: v}})} />
             <SocialInput icon={Twitter} label="Twitter/X" value={config.socialLinks?.twitter || ''} onChange={v => setConfig({...config, socialLinks: {...config.socialLinks, twitter: v}})} />
             <SocialInput icon={Linkedin} label="LinkedIn" value={config.socialLinks?.linkedin || ''} onChange={v => setConfig({...config, socialLinks: {...config.socialLinks, linkedin: v}})} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div>
    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-2 tracking-[0.2em]">{label}</label>
    <input 
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-black transition-all"
    />
  </div>
);

const SocialInput = ({ label, value, onChange, icon: Icon }: { label: string, value: string, onChange: (v: string) => void, icon: LucideIcon }) => (
  <div className="flex items-center gap-4 group">
    <div className="p-3 bg-white border border-zinc-200 rounded-xl group-hover:bg-black group-hover:text-white transition-all shadow-sm">
      <Icon className="w-4 h-4" />
    </div>
    <input 
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={label}
      className="flex-1 bg-transparent border-b border-zinc-200 p-2 text-sm focus:outline-none focus:border-black transition-all"
    />
  </div>
);

export default AgencySettings;
