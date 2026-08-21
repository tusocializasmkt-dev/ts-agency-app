import { useNavigate } from 'react-router-dom';
import DashboardCards from './DashboardCards';
import ClientList from './Admin/ClientList';
import { useBrands } from '../hooks';
import { ROUTES } from '../app/router/routes';

export default function AdminDashboard() {
  const { brands } = useBrands();
  const navigate = useNavigate();
  return <div className="space-y-8"><DashboardCards brands={brands} /><h2 className="text-2xl font-bold tracking-tight">Meus Clientes</h2><ClientList brands={brands} onSelectBrand={id => navigate(ROUTES.admin.clientDetailFor(id))} /></div>;
}
