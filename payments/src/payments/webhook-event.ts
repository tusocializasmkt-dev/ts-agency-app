export function isMercadoPagoOrderEvent(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return (body as Record<string, unknown>).type === 'order';
}
