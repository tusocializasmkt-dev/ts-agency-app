import { useState } from 'react';
import CalendarView from '../../components/CalendarView';
export default function AdminCalendarPage() { const [brandId, setBrandId] = useState<string | null>(null); return <CalendarView selectedBrandId={brandId} isAdmin onBrandChange={setBrandId} />; }
