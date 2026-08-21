import { useState } from 'react';
import InsightsView from '../../components/InsightsView';
export default function AdminInsightsPage() { const [brandId, setBrandId] = useState<string | null>(null); return <InsightsView selectedBrandId={brandId} isAdmin onBrandChange={setBrandId} />; }
