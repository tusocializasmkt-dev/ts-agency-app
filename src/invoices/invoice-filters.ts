import type { Invoice } from '../types';
export type InvoiceFilter = 'open' | 'future' | 'paid' | 'all';
export function saoPauloDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-');
}
const civilTime = (date: string) => Date.parse(`${date}T12:00:00Z`);
const paidTime = (invoice: Invoice) => invoice.paidAt && 'toMillis' in invoice.paidAt ? invoice.paidAt.toMillis() : civilTime(invoice.dueDate);
export function filterInvoices(invoices: Invoice[], filter: InvoiceFilter, now = new Date()): Invoice[] {
  const month = saoPauloDate(now).slice(0, 7);
  const open = (invoice: Invoice) => ['pending', 'overdue', 'payment_reported'].includes(invoice.status);
  return invoices.filter(invoice => filter === 'all' || (filter === 'paid' ? invoice.status === 'paid' : open(invoice) && (filter === 'future' ? invoice.dueDate.slice(0, 7) > month : invoice.dueDate.slice(0, 7) <= month)))
    .sort((a, b) => (filter === 'paid' ? paidTime(b) - paidTime(a) : civilTime(a.dueDate) - civilTime(b.dueDate)) || a.id.localeCompare(b.id));
}
export function invoiceMonthLabel(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));
}
