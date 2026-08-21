import { describe, expect, it } from 'vitest';
import { mapPayment, mapPaymentAttempt, mapPaymentEvent } from '../data/mappers/payment.mapper';
const snap = (id: string, data: object) => ({ id, data: () => data });
describe('payment mappers', () => { it('injeta IDs, normaliza datas e converte amount legado', () => { const date = new Date('2026-01-01'); const timestamp = { toDate: () => date }; expect(mapPayment(snap('p', { amount: 10.5, createdAt: timestamp }) as never)).toMatchObject({ id: 'p', amountCents: 1050, createdAt: date }); expect(mapPaymentAttempt(snap('a', { completedAt: timestamp }) as never)).toMatchObject({ id: 'a', completedAt: date }); expect(mapPaymentEvent(snap('e', { receivedAt: timestamp }) as never)).toMatchObject({ id: 'e', receivedAt: date }); }); });
