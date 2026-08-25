const pad = (value: number) => String(value).padStart(2, '0');

export function formatPostDateTimeForInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localPostDateTimeToISOString(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Informe uma data e hora válidas.');
  const [, year, month, day, hours, minutes] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || date.getHours() !== Number(hours) || date.getMinutes() !== Number(minutes)) throw new Error('Informe uma data e hora válidas.');
  return date.toISOString();
}

export function getLocalMonthIsoRange(month: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error('Mês inválido.');
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) throw new Error('Mês inválido.');
  return { start: new Date(year, monthIndex, 1).toISOString(), end: new Date(year, monthIndex + 1, 1).toISOString() };
}
