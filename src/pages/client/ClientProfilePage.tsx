import ClientProfile from '../../components/Client/ClientProfile';
import { useAuth } from '../../contexts/AuthContext';
export default function ClientProfilePage() { const { brandId } = useAuth(); return brandId ? <ClientProfile brandId={brandId} /> : <div>Cliente não identificado.</div>; }
