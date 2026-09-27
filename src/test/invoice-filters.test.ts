import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { filterInvoices, invoiceMonthLabel, saoPauloDate } from '../invoices/invoice-filters';
import { getEffectiveInvoiceStatus } from '../invoices/invoice-domain';
import type { Invoice } from '../types';
const invoice = (id: string, dueDate: string, status: Invoice['status'] = 'pending'): Invoice => ({ id, dueDate, status, brandId: 'b', amount: 100 });
const now = new Date('2026-10-15T12:00:00Z');
const invoices = [invoice('feb', '2027-02-02'), invoice('oct', '2026-10-20'), invoice('sept', '2026-09-20'), invoice('nov', '2026-11-20'), invoice('reported', '2026-10-01', 'payment_reported'), invoice('paid', '2026-09-01', 'paid'), invoice('cancelled', '2026-01-01', 'cancelled'), invoice('suspended', '2026-01-01', 'suspended')];
describe('filtros financeiros no calendário de São Paulo', () => {
  it('Em aberto inclui vencidas e todo mês atual, inclusive pagamento informado', () => expect(filterInvoices(invoices, 'open', now).map(i => i.id)).toEqual(['sept', 'reported', 'oct']));
  it('Futuras ordena meses e anos próximos primeiro, sem alterar a entrada', () => { expect(filterInvoices(invoices, 'future', now).map(i => i.id)).toEqual(['nov', 'feb']); expect(invoices[0].id).toBe('feb'); });
  it('vencidas não desaparecem na virada do mês', () => expect(filterInvoices(invoices, 'open', new Date('2026-12-01T12:00:00Z')).map(i => i.id)).toEqual(['sept', 'reported', 'oct', 'nov']));
  it('Todas inclui encerradas, com ordem cronológica e desempate estável', () => expect(filterInvoices(invoices, 'all', now).map(i => i.id)).toEqual(['cancelled', 'suspended', 'paid', 'sept', 'reported', 'oct', 'nov', 'feb']));
  it('Pagas usa confirmação mais recente primeiro', () => { const paid = [ { ...invoice('a', '2027-01-01', 'paid'), paidAt: Timestamp.fromDate(new Date('2026-09-02')) }, { ...invoice('b', '2026-01-01', 'paid'), paidAt: Timestamp.fromDate(new Date('2026-10-01')) } ]; expect(filterInvoices([...paid, ...invoices], 'paid', now).map(i => i.id)).toEqual(['b', 'a', 'paid']); });
  it('meia-noite UTC ainda é mês anterior em São Paulo', () => { const instant = new Date('2026-11-01T01:00:00Z'); expect(saoPauloDate(instant)).toBe('2026-10-31'); expect(filterInvoices(invoices, 'future', instant).map(i => i.id)).toEqual(['nov', 'feb']); expect(getEffectiveInvoiceStatus(invoice('today', '2026-10-31'), instant)).toBe('pending'); });
  it('fevereiro e ano bissexto mantêm ordem civil', () => { const data = [invoice('mar', '2028-03-01'), invoice('leap', '2028-02-29'), invoice('feb', '2028-02-28')]; expect(filterInvoices(data, 'all').map(i => i.id)).toEqual(['feb', 'leap', 'mar']); expect(invoiceMonthLabel('2028-02-29')).toBe('fevereiro de 2028'); });
});
