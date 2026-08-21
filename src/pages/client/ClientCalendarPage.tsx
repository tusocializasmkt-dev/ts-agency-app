import CalendarView from '../../components/CalendarView';
import { useAuth } from '../../contexts/AuthContext';
export default function ClientCalendarPage() { const { brandId } = useAuth(); return brandId ? <CalendarView selectedBrandId={brandId} isAdmin={false} /> : <div>Cliente não identificado.</div>; }
