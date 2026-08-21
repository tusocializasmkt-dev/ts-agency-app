import { FirebaseError } from 'firebase/app';

export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly entity: string,
    public readonly originalError?: unknown,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export function normalizeFirestoreError(error: unknown, operation: string, entity: string): PersistenceError {
  if (error instanceof PersistenceError) return error;
  const code = error instanceof FirebaseError ? error.code : undefined;
  return new PersistenceError('Não foi possível concluir a operação de dados.', operation, entity, error, code);
}
