import { describe, expect, it } from 'vitest';
import { MAX_MEDIA_BATCH_FILES, MAX_MEDIA_FILE_SIZE_BYTES, buildBrandMediaPath, sanitizeFileName, validateMediaBatch, validateMediaFile } from '../media';

const file = (name = 'foto.jpg', type = 'image/jpeg', size = 10) => new File([new Uint8Array(size)], name, { type });

describe('media validation', () => {
  it('aceita MIME e extensão permitidos', () => expect(validateMediaFile(file()).valid).toBe(true));
  it('rejeita MIME ou extensão proibidos', () => expect(validateMediaFile(file('x.exe', 'application/octet-stream')).errors[0].code).toBe('unsupported-file-type'));
  it('rejeita arquivo grande e vazio', () => { expect(validateMediaFile({ name: 'x.jpg', type: 'image/jpeg', size: MAX_MEDIA_FILE_SIZE_BYTES + 1 }).errors.some(error => error.code === 'file-too-large')).toBe(true); expect(validateMediaFile(file('x.jpg', 'image/jpeg', 0)).valid).toBe(false); });
  it('valida quantidade e tamanho do lote', () => { expect(validateMediaBatch(Array.from({ length: MAX_MEDIA_BATCH_FILES + 1 }, () => file())).errors.some(error => error.code === 'batch-too-large')).toBe(true); expect(validateMediaBatch([{ name: 'a.mp4', type: 'video/mp4', size: 500 * 1024 * 1024 + 1 }]).valid).toBe(false); });
});

describe('media paths', () => {
  it('constrói path isolado por marca e ID', () => expect(buildBrandMediaPath('brand_1', 'media_1', 'Foto Final.JPG')).toBe('brands/brand_1/media/media_1/foto-final.jpg'));
  it('sanitiza nomes', () => expect(sanitizeFileName(' Mídia (1).PNG ')).toBe('midia-1-.png'));
  it('bloqueia traversal e segmentos arbitrários', () => { expect(() => buildBrandMediaPath('../brand', 'id', 'x.jpg')).toThrow(); expect(buildBrandMediaPath('brand', 'id', '../../x.jpg')).toBe('brands/brand/media/id/x.jpg'); });
  it('evita colisão por nome com mediaId', () => expect(buildBrandMediaPath('b', 'one', 'x.jpg')).not.toBe(buildBrandMediaPath('b', 'two', 'x.jpg')));
});
