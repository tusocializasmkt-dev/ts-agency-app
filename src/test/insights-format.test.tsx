import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../hooks', () => ({ useBrands: () => ({ brands: [] }), useFeedback: () => ({}), useMetrics: () => ({ loading: false, error: null, organic: [{ followers: 1250, reach: 2000, impressions: 3000, engagement: 5.85 }], paid: [{ investment: 1250, cpc: 8.32, ctr: 5.85, conversions: 1250 }] }) }));
vi.mock('../hooks/useMarketingAI', () => ({ useMarketingAI: () => ({}) }));
vi.mock('../components/MetricsDialog', () => ({ default: () => null }));
vi.mock('recharts', () => {
  const Container = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Container, LineChart: Container, BarChart: Container, Line: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null };
});
import InsightsView from '../components/InsightsView';
import { formatMetricCurrency, formatMetricNumber, formatMetricPercent } from '../metrics/metric-format';
describe('Insights em pt-BR', () => {
  it('formata moeda e pontos percentuais sem multiplicar os valores', () => {
    expect(formatMetricCurrency(1250).replace(/\s/g, ' ')).toBe('R$ 1.250,00');
    expect(formatMetricCurrency(8.32).replace(/\s/g, ' ')).toBe('R$ 8,32');
    expect(formatMetricPercent(5.85)).toBe('5,85%');
    expect(formatMetricPercent(0.5)).toBe('0,5%');
    expect(formatMetricNumber(1250)).toBe('1.250');
  });
  it('aplica formatação aos cards orgânicos e pagos', () => {
    render(<InsightsView selectedBrandId="b" isAdmin={false} />);
    expect(screen.getByText('5,85%')).toBeInTheDocument();
    expect(screen.getByText('1.250')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tráfego Pago' }));
    expect(screen.getByText(/R\$\s1\.250,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s8,32/)).toBeInTheDocument();
    expect(screen.getByText('5,85%')).toBeInTheDocument();
  });
});
