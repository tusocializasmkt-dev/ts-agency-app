import { describe, expect, it, vi } from 'vitest';
import { mapMedia, toMediaWriteData } from '../data/mappers/media.mapper';

describe('media mapper', () => {
  it('injeta ID, normaliza timestamps e remove undefined', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    const asset = mapMedia({ id: 'm1', data: () => ({ brandId: 'b', createdAt: { toDate: () => date } }) } as never);
    expect(asset.id).toBe('m1'); expect(asset.createdAt).toEqual(date);
    expect(toMediaWriteData({ id: 'm1', brandId: 'b', downloadUrl: undefined })).toEqual({ brandId: 'b' });
  });
  it('não persiste ID', () => expect(toMediaWriteData({ id: 'secret', status: 'ready' })).toEqual({ status: 'ready' }));
  it('falha para snapshot inexistente', () => expect(() => mapMedia({ id: 'm', data: vi.fn() } as never)).toThrow());
});
