import { describe, expect, it } from 'vitest';
import { mapAgencyConfig, mapBrand, mapInvoice, mapOrganicMetrics, mapPaidMetrics, mapPost, mapTrashItem, toAgencyConfigWriteData, toBrandWriteData, toPostWriteData, toRestoredPostWriteData } from '../data/mappers';

const snapshot = (id: string, data: Record<string, unknown>) => ({ id, data: () => data }) as never;

describe('mappers', () => {
  it('Brand lê aliases, usa id do snapshot e não grava id/undefined', () => {
    const brand = mapBrand(snapshot('b1', { name: 'B', googleDriveLink: 'drive', contractLink: 'contract', unknown: true }));
    expect(brand).toMatchObject({ id: 'b1', driveUrl: 'drive', contractUrl: 'contract' });
    expect(toBrandWriteData({ id: 'b1', name: 'B', phone: undefined })).toEqual({ name: 'B' });
  });
  it('Post normaliza aliases legados e persiste somente campos canônicos', () => {
    const post = mapPost(snapshot('p1', { type: 'post', scheduledAt: '2026-01-01', rejectionComment: 'ajuste' }));
    expect(post).toMatchObject({ id: 'p1', type: 'feed', scheduledDate: '2026-01-01', feedback: 'ajuste' });
    expect(toPostWriteData({ id: 'p1', type: 'feed', feedback: undefined })).toEqual({ type: 'feed' });
  });
  it('Invoice normaliza boleto e promessa', () => {
    expect(mapInvoice(snapshot('i1', { pdfUrl: 'boleto', paymentPromise: { date: '2026-01-02', description: 'pago' } }))).toMatchObject({ id: 'i1', boletoUrl: 'boleto', paymentPromise: { promiseDate: '2026-01-02' } });
  });
  it('mapeia métricas, lixeira e configuração', () => {
    expect(mapOrganicMetrics(snapshot('o1', { brandId: 'b1' }))).toMatchObject({ id: 'o1', brandId: 'b1' });
    expect(mapPaidMetrics(snapshot('m1', { brandId: 'b1' }))).toMatchObject({ id: 'm1', brandId: 'b1' });
    const trash = mapTrashItem(snapshot('t1', { type: 'post', sourceCollection: 'posts', deletedAt: 'x' })); expect(trash).toMatchObject({ id: 't1', type: 'feed' });
    expect(toRestoredPostWriteData(trash)).not.toHaveProperty('id'); expect(toRestoredPostWriteData(trash)).not.toHaveProperty('deletedAt');
    const config = mapAgencyConfig(snapshot('default', { name: 'Agência', phone: undefined })); expect(config.name).toBe('Agência'); expect(toAgencyConfigWriteData(config)).toEqual({ name: 'Agência' });
  });
});
