import { AppError } from '../shared/errors.js';

export type ProviderErrorCategory = 'authorization' | 'invalid_request' | 'rate_limit' | 'provider_unavailable' | 'network' | 'unknown';
export type ProviderErrorDiagnostics = {
  category: ProviderErrorCategory;
  httpStatus?: number;
  providerCode?: string;
  providerType?: string;
  providerMessage?: string;
  retryable: boolean;
};

const safeIdentifier = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,80}$/.test(value) ? value : undefined;
const safeMessage = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/authorization\s*[:=]\s*[^\s,;]+/gi, 'authorization=[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/(?:access[_-]?token|token)\s*[:=]\s*[^\s,;]+/gi, 'token=[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 160) || undefined;
};

export function normalizeProviderError(error: unknown): ProviderErrorDiagnostics {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const httpStatus = typeof value.status === 'number' && Number.isInteger(value.status) ? value.status : undefined;
  const category: ProviderErrorCategory = httpStatus === 401 || httpStatus === 403 ? 'authorization'
    : httpStatus === 400 || httpStatus === 422 ? 'invalid_request'
      : httpStatus === 429 ? 'rate_limit'
        : httpStatus !== undefined && httpStatus >= 500 ? 'provider_unavailable'
          : value.name === 'MPConnectionError' || (error instanceof Error && /timeout|network|fetch|socket|dns/i.test(error.message)) ? 'network'
            : 'unknown';
  const causes = Array.isArray(value.causes) ? value.causes : [];
  const firstCause = causes[0] && typeof causes[0] === 'object' ? causes[0] as Record<string, unknown> : undefined;
  const providerCode = safeIdentifier(value.error) ?? safeIdentifier(firstCause?.code);
  return {
    category,
    ...(httpStatus !== undefined ? { httpStatus } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(safeIdentifier(value.name) ? { providerType: String(value.name) } : {}),
    ...(safeMessage(error instanceof Error ? error.message : value.message) ? { providerMessage: safeMessage(error instanceof Error ? error.message : value.message) } : {}),
    retryable: category === 'rate_limit' || category === 'provider_unavailable' || category === 'network',
  };
}

export class ProviderError extends AppError {
  constructor(public readonly diagnostics: ProviderErrorDiagnostics, public readonly operation: 'create_pix' | 'get_payment') {
    super('unavailable', operation === 'create_pix' ? 'Mercado Pago indisponível. Tente novamente.' : 'Não foi possível confirmar o pagamento no provedor.');
    this.name = 'ProviderError';
  }
}
