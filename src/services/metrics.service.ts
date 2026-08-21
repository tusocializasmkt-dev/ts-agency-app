import type { OrganicMetrics, PaidMetrics } from '../types';
import { subscribeToOrganicMetrics, subscribeToPaidMetrics, upsertOrganicMetrics, upsertPaidMetrics } from '../data/repositories';
export { subscribeToOrganicMetrics as watchOrganicMetrics, subscribeToPaidMetrics as watchPaidMetrics };

const finite = (value: number) => Number.isFinite(value) && value >= 0;
export async function saveOrganicMetrics(data: Omit<OrganicMetrics, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!data.brandId || !/^\d{4}-\d{2}$/.test(data.month) || ![data.followers, data.engagement, data.reach, data.impressions].every(finite)) throw new Error('Métricas orgânicas inválidas.');
  await upsertOrganicMetrics(data);
}
export async function savePaidMetrics(data: Omit<PaidMetrics, 'id' | 'createdAt' | 'updatedAt' | 'cpc' | 'cpl' | 'ctr' | 'roas'>) {
  const values = [data.investment, data.reach ?? 0, data.impressions ?? 0, data.clicks, data.leads ?? 0, data.conversions, data.revenue ?? 0];
  if (!data.brandId || !/^\d{4}-\d{2}$/.test(data.month) || !values.every(finite)) throw new Error('Métricas de tráfego inválidas.');
  const cpc = data.clicks > 0 ? data.investment / data.clicks : 0;
  const cpl = (data.leads ?? 0) > 0 ? data.investment / data.leads! : 0;
  const ctr = (data.impressions ?? 0) > 0 ? data.clicks / data.impressions! * 100 : 0;
  const roas = data.investment > 0 ? (data.revenue ?? 0) / data.investment : 0;
  await upsertPaidMetrics({ ...data, cpc, cpl, ctr, roas });
}
