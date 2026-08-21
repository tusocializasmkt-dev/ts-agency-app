import { FirebaseError } from 'firebase/app';

export type MediaErrorCode = 'unsupported-file-type' | 'file-too-large' | 'batch-too-large' | 'unauthorized' | 'upload-failed' | 'cancelled' | 'network-error' | 'metadata-write-failed' | 'orphaned-file' | 'media-in-use' | 'invalid-brand' | 'invalid-path';

const messages: Record<MediaErrorCode, string> = {
  'unsupported-file-type': 'Este tipo de arquivo não é permitido.',
  'file-too-large': 'O arquivo excede o tamanho permitido.',
  'batch-too-large': 'O lote excede os limites permitidos.',
  unauthorized: 'Você não tem permissão para realizar esta ação.',
  'upload-failed': 'Não foi possível enviar o arquivo.',
  cancelled: 'O envio foi cancelado.',
  'network-error': 'Houve um problema de conexão durante o envio.',
  'metadata-write-failed': 'Não foi possível salvar os dados da mídia.',
  'orphaned-file': 'O arquivo foi enviado, mas seu registro não pôde ser concluído.',
  'media-in-use': 'Esta mídia está em uso e não pode ser excluída.',
  'invalid-brand': 'A marca informada é inválida.',
  'invalid-path': 'O caminho do arquivo é inválido.',
};

export class MediaError extends Error {
  constructor(public readonly code: MediaErrorCode, public readonly cause?: unknown) {
    super(messages[code]); this.name = 'MediaError';
  }
}

export function normalizeMediaError(error: unknown, fallback: MediaErrorCode = 'upload-failed'): MediaError {
  if (error instanceof MediaError) return error;
  if (error instanceof FirebaseError) {
    if (error.code.includes('unauthorized')) return new MediaError('unauthorized', error);
    if (error.code.includes('canceled')) return new MediaError('cancelled', error);
    if (error.code.includes('network')) return new MediaError('network-error', error);
  }
  return new MediaError(fallback, error);
}
