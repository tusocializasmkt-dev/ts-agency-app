import { describe, expect, it } from 'vitest';
import type { Invoice } from '../types';
import { assertInvoiceTransition, buildRecurringDueDates, formatCurrencyBRL, getEffectiveInvoiceStatus, validateCivilDate, validateInvoiceAmount, validatePaymentPromise, validatePixLink } from '../invoices';
const invoice = (data: Partial<Invoice> = {}): Invoice => ({ id: 'i', brandId: 'b', amount: 100, dueDate: '2026-01-01', status: 'pending', ...data });
describe('invoice domain', () => {
  it('deriva overdue sem sobrescrever estados terminais', () => { const now = new Date('2026-01-10T12:00:00Z'); expect(getEffectiveInvoiceStatus(invoice(), now)).toBe('overdue'); expect(getEffectiveInvoiceStatus(invoice({ status: 'paid' }), now)).toBe('paid'); });
  it('valida transições', () => { expect(() => assertInvoiceTransition('overdue', 'paid')).not.toThrow(); expect(() => assertInvoiceTransition('paid', 'pending')).toThrow(); });
  it('valida valor, data civil e link', () => { expect(() => validateInvoiceAmount(10.25)).not.toThrow(); expect(() => validateInvoiceAmount(0)).toThrow(); expect(() => validateCivilDate('2026-02-30')).toThrow(); expect(() => validatePixLink('javascript:alert(1)')).toThrow(); expect(formatCurrencyBRL(10)).toContain('10,00'); });
  it('aplica regra de promessa', () => { const now = new Date('2026-01-05T12:00:00Z'); expect(validatePaymentPromise(invoice(), '2026-01-10', 'Pagarei nessa data', now)).toMatchObject({ status: 'pending' }); });
  it('gera setembro a dezembro inclusive', () => expect(buildRecurringDueDates({ start: '2026-09', end: '2026-12', day: 10 }).map(item => item.dueDate)).toEqual(['2026-09-10','2026-10-10','2026-11-10','2026-12-10']));
  it('ajusta 31 ao último dia válido', () => expect(buildRecurringDueDates({ start: '2024-02', end: '2024-04', day: 31 }).map(item => item.dueDate)).toEqual(['2024-02-29','2024-03-31','2024-04-30']));
  it('rejeita período invertido, dia e duração inválidos', () => { expect(() => buildRecurringDueDates({ start: '2026-12', end: '2026-09', day: 10 })).toThrow(); expect(() => buildRecurringDueDates({ start: '2026-01', end: '2026-02', day: 32 })).toThrow(); expect(() => buildRecurringDueDates({ start: '2020-01', end: '2026-01', day: 1 })).toThrow(); });
});
