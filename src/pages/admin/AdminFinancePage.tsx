import { useState } from 'react';
import FinanceView from '../../components/FinanceView';
export default function AdminFinancePage() { const [brandId, setBrandId] = useState<string | null>(null); return <FinanceView selectedBrandId={brandId} isAdmin onBrandChange={setBrandId} />; }
