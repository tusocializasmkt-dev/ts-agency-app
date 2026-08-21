import { MediaError } from './media.errors';

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

function requireSegment(value: string): string {
  const normalized = value.trim();
  if (!normalized || !SAFE_SEGMENT.test(normalized)) throw new MediaError('invalid-path');
  return normalized;
}

export function sanitizeFileName(fileName: string): string {
  const leaf = fileName.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  const normalized = leaf.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/\.{2,}/g, '.').replace(/^-+|-+$/g, '');
  if (!normalized || normalized === '.' || normalized.startsWith('.')) throw new MediaError('invalid-path');
  return normalized;
}

export function buildBrandMediaPath(brandId: string, mediaId: string, originalFileName: string): string {
  return `brands/${requireSegment(brandId)}/media/${requireSegment(mediaId)}/${sanitizeFileName(originalFileName)}`;
}

export function buildThumbnailPath(brandId: string, mediaId: string): string {
  return `brands/${requireSegment(brandId)}/media/${requireSegment(mediaId)}/thumbnail.webp`;
}
