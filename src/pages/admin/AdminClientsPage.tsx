import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientList from '../../components/Admin/ClientList';
import ClientDialog, { type NewClientInput } from '../../components/Admin/ClientDialog';
import AccessConfirmationDialog, { type TemporaryAccess } from '../../components/Admin/AccessConfirmationDialog';
import { useBrands, useFeedback } from '../../hooks';
import { ROUTES } from '../../app/router/routes';
import { callCreateClientWithAccess } from '../../data/functions';
import { APP_URL } from '../../config/app';

export default function AdminClientsPage() {
  const { brands, loading, error, create } = useBrands();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const [dialog, setDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccess | null>(null);
  const [createdId, setCreatedId] = useState('');
  if (loading) return <div className="p-20 text-center text-zinc-400">Carregando...</div>;
  if (error) return <div className="p-20 text-center text-red-500">{error}</div>;
  const save = async (input: NewClientInput) => {
    setCreating(true);
    try {
      if (input.createAccess && input.accessEmail && input.password) {
        const result = await callCreateClientWithAccess({ brand: input.brand, email: input.accessEmail, password: input.password, active: true });
        setCreatedId(result.uid);
        setTemporaryAccess({ name: input.brand.name, email: result.email, password: input.password, portalUrl: APP_URL });
      } else {
        const id = await create(input.brand);
        feedback.success('Cliente criado.');
        setDialog(false);
        navigate(ROUTES.admin.clientDetailFor(id));
      }
    } finally { setCreating(false); }
  };
  return <div className="space-y-8"><header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-bold tracking-tight">Meus Clientes</h2><button onClick={() => setDialog(true)} className="min-h-11 rounded-xl bg-black px-5 font-bold text-white"><Plus className="mr-2 inline h-4 w-4" />Novo cliente</button></header><ClientList brands={brands} onSelectBrand={id => navigate(ROUTES.admin.clientDetailFor(id))} />{dialog && <ClientDialog processing={creating} onClose={() => setDialog(false)} onSave={save} />}{temporaryAccess && <AccessConfirmationDialog access={temporaryAccess} onClose={() => { setTemporaryAccess(null); setDialog(false); navigate(ROUTES.admin.clientDetailFor(createdId)); }} />}</div>;
}
