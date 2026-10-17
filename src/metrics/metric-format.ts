const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatMetricNumber = (value: number) => decimal.format(value);
export const formatMetricCurrency = (value: number) => currency.format(value);
// CTR is stored as clicks / impressions * 100; engagement is entered in percentage points.
export const formatMetricPercent = (value: number) => `${decimal.format(value)}%`;
export function formatMetricMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[1]}` : value;
}
