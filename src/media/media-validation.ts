import { ALLOWED_MEDIA_EXTENSIONS, ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_BATCH_FILES, MAX_MEDIA_BATCH_SIZE_BYTES, MAX_MEDIA_FILE_SIZE_BYTES, MAX_MEDIA_PER_POST } from './media.constants';
import { MediaError } from './media.errors';
import type { MediaValidationResult } from './media.types';

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';

export function validateMediaFile(file: Pick<File, 'name' | 'size' | 'type'>): MediaValidationResult {
  const errors: MediaError[] = [];
  if (!file.name.trim() || file.name.includes('/') || file.name.includes('\\') || file.name.includes('..')) errors.push(new MediaError('invalid-path'));
  if (!file.size) errors.push(new MediaError('unsupported-file-type'));
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_MIME_TYPES)[number]) || !ALLOWED_MEDIA_EXTENSIONS.includes(extensionOf(file.name) as (typeof ALLOWED_MEDIA_EXTENSIONS)[number])) errors.push(new MediaError('unsupported-file-type'));
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) errors.push(new MediaError('file-too-large'));
  return { valid: errors.length === 0, errors };
}

export function validateMediaBatch(files: readonly Pick<File, 'name' | 'size' | 'type'>[], forPost = false): MediaValidationResult {
  const errors = files.flatMap(file => validateMediaFile(file).errors);
  const maximum = forPost ? Math.min(MAX_MEDIA_BATCH_FILES, MAX_MEDIA_PER_POST) : MAX_MEDIA_BATCH_FILES;
  if (files.length > maximum || files.reduce((total, file) => total + file.size, 0) > MAX_MEDIA_BATCH_SIZE_BYTES) errors.push(new MediaError('batch-too-large'));
  return { valid: errors.length === 0, errors };
}
