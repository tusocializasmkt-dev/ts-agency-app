import { createStorageReference, deleteStoredFile, getFileDownloadUrl, uploadFile } from '../data/repositories/storage.repository';

export type LogoStage = 'validation' | 'upload' | 'url' | 'persist';
export class AgencyLogoError extends Error {
  constructor(public readonly stage: LogoStage, public readonly code: string, public readonly cleanup: 'not-needed' | 'removed' | 'retained') {
    super('agency-logo-failed');
  }
}
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxSize = 5 * 1024 * 1024;
const knownCodes = new Set(['permission-denied', 'unauthenticated', 'not-found', 'invalid-argument', 'unavailable', 'deadline-exceeded', 'storage/unauthorized', 'storage/object-not-found', 'storage/retry-limit-exceeded']);
function safeCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';
  const value = error as { code?: string; cause?: unknown; originalError?: unknown };
  const nested = value.cause ?? value.originalError;
  return nested ? safeCode(nested) : value.code && knownCodes.has(value.code) ? value.code : 'unknown';
}

export async function uploadAgencyLogo(file: File, persist: (logoUrl: string) => Promise<void>): Promise<string> {
  if (!allowedTypes.has(file.type)) throw new AgencyLogoError('validation', 'invalid-type', 'not-needed');
  if (file.size > maxSize) throw new AgencyLogoError('validation', 'too-large', 'not-needed');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const reference = createStorageReference(`agency/logo/logo-${Date.now()}-${crypto.randomUUID()}.${extension}`);
  let stage: LogoStage = 'upload';
  let uploaded = false;
  try {
    const result = await uploadFile(reference, file).completion;
    uploaded = true; stage = 'url';
    const logoUrl = await getFileDownloadUrl(result);
    stage = 'persist';
    await persist(logoUrl);
    return logoUrl;
  } catch (error) {
    const code = safeCode(error);
    let cleanup: AgencyLogoError['cleanup'] = 'not-needed';
    if (uploaded) {
      cleanup = 'retained';
      // Never delete a possibly committed logo after an ambiguous network failure.
      if (stage === 'url' || ['permission-denied', 'unauthenticated', 'not-found', 'invalid-argument'].includes(code)) {
        try { await deleteStoredFile(reference); cleanup = 'removed'; } catch { /* Keep the primary stage/code. */ }
      }
    }
    throw new AgencyLogoError(stage, code, cleanup);
  }
}

export function agencyLogoErrorMessage(error: unknown): string {
  if (!(error instanceof AgencyLogoError)) return 'Não foi possível atualizar o logotipo.';
  if (error.code === 'invalid-type') return 'Formato inválido. Use PNG, JPG, JPEG ou WEBP.';
  if (error.code === 'too-large') return 'O logotipo deve ter no máximo 5 MB.';
  if (error.stage === 'persist' && error.cleanup === 'retained' && !['permission-denied', 'unauthenticated', 'not-found', 'invalid-argument'].includes(error.code)) return 'Não foi possível confirmar a gravação do logotipo. Atualize a página para verificar antes de tentar novamente.';
  const step = error.stage === 'url' ? 'obter a URL do logotipo' : error.stage === 'persist' ? 'salvar o logotipo nas configurações' : 'enviar o logotipo';
  return `Não foi possível ${step}. O anterior foi mantido.`;
}
