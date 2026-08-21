interface SafeErrorReport { name: string; source: 'render'; }

export function reportUnexpectedError(error: unknown): void {
  const report: SafeErrorReport = { name: error instanceof Error ? error.name : 'UnknownError', source: 'render' };
  const isLocalDevelopment = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalDevelopment) console.error('[Unexpected application error]', report);
  // Extension point for a future privacy-reviewed monitoring service.
}
