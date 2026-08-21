import { describe, expect, it } from 'vitest';
import { AUTOMATED_PAYMENTS_ENABLED, INVOICE_DUE_SOON_DAYS } from '../config/features';

describe('configuração do financeiro MVP', () => {
  it('mantém pagamentos automáticos desativados e alerta com três dias', () => {
    expect(AUTOMATED_PAYMENTS_ENABLED).toBe(false);
    expect(INVOICE_DUE_SOON_DAYS).toBe(3);
  });
});
