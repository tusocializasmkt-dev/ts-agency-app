import { describe, expect, it } from 'vitest';
import { formatPostDateTimeForInput, getLocalMonthIsoRange, localPostDateTimeToISOString } from '../posts';

describe('data e hora de posts', () => {
  it('converte São Paulo para UTC, inclusive na virada do dia', () => {
    expect(localPostDateTimeToISOString('2026-10-28T14:00')).toBe('2026-10-28T17:00:00.000Z');
    expect(localPostDateTimeToISOString('2026-10-28T23:30')).toBe('2026-10-29T02:30:00.000Z');
    expect(formatPostDateTimeForInput('2026-10-29T02:30:00.000Z')).toBe('2026-10-28T23:30');
  });
  it('preserva exatamente os valores locais escolhidos ao salvar e reabrir', () => {
    const input = '2026-08-25T14:35';
    expect(formatPostDateTimeForInput(localPostDateTimeToISOString(input))).toBe(input);
  });
  it('calcula os limites mensais usando meia-noite local', () => {
    const range = getLocalMonthIsoRange('2026-08');
    const start = new Date(range.start); const end = new Date(range.end);
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 7, 1, 0]);
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours()]).toEqual([2026, 8, 1, 0]);
  });
  it('rejeita datas civis impossíveis', () => expect(() => localPostDateTimeToISOString('2026-02-30T10:00')).toThrow());
});
