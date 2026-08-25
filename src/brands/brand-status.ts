import type { BrandStatus } from '../types';

export const BRAND_STATUSES: readonly BrandStatus[] = ['active', 'warning', 'delinquent', 'suspended', 'banning'];
export const BRAND_STATUS_LABELS: Record<BrandStatus, string> = { active: 'Ativo', warning: 'Atenção', delinquent: 'Inadimplente', suspended: 'Suspenso', banning: 'Banimento' };

export function normalizeBrandStatus(status: unknown): BrandStatus {
  if (status === 'pending') return 'warning';
  return BRAND_STATUSES.includes(status as BrandStatus) ? status as BrandStatus : 'warning';
}

export function getBrandStatusRingClass(status: unknown): string {
  switch (normalizeBrandStatus(status)) {
    case 'active': return 'ring-green-500';
    case 'warning': return 'ring-amber-500';
    case 'delinquent': return 'ring-red-600';
    case 'suspended': return 'ring-zinc-400 grayscale opacity-70';
    case 'banning': return 'ring-zinc-900';
  }
}

export function getBrandStatusBadgeClass(status: unknown): string {
  switch (normalizeBrandStatus(status)) {
    case 'active': return 'bg-green-50 text-green-700 border-green-200';
    case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'delinquent': return 'bg-red-50 text-red-700 border-red-200';
    case 'suspended': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
    case 'banning': return 'bg-zinc-900 text-white border-zinc-900';
  }
}
