import type { AgencyConfig } from '../types';

export function safeHttpsUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    return url.href;
  } catch { return undefined; }
}
export function mercadoPagoLink(value?: string): string | undefined {
  const safe = safeHttpsUrl(value);
  if (!safe) return undefined;
  const { hostname, pathname } = new URL(safe);
  if (pathname === '/' || !(hostname === 'mpago.la' || hostname === 'mercadopago.com.br' || hostname.endsWith('.mercadopago.com.br'))) return undefined;
  return safe;
}
export function validatePaymentSettings(config: Partial<AgencyConfig>): void {
  if (config.pixQrCodeUrl?.trim() && !safeHttpsUrl(config.pixQrCodeUrl)) throw new Error('Informe uma URL HTTPS válida para o QR Code Pix.');
  if (config.mercadopagoPaymentLink?.trim() && !mercadoPagoLink(config.mercadopagoPaymentLink)) throw new Error('Informe um link HTTPS de pagamento do Mercado Pago (mercadopago.com.br ou mpago.la).');
}
