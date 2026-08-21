import { useState } from 'react';
import FeedView from '../../components/FeedView';
export default function AdminPostsPage() { const [brandId, setBrandId] = useState<string | null>(null); return <FeedView selectedBrandId={brandId} isAdmin onBrandChange={setBrandId} />; }
