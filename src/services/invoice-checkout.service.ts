import { callCreateInvoiceCheckout } from '../data/functions/invoice-checkout.functions';
export function validateHostedCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.mercadopago.com.br', 'mercadopago.com.br', 'sandbox.mercadopago.com.br', 'sandbox.mercadopago.com'].includes(url.hostname) || !url.pathname.includes('/checkout/')) throw new Error('invalid-checkout-url');
  return url.href;
}
export async function createInvoiceCheckout(invoiceId: string) {
  const result = await callCreateInvoiceCheckout(invoiceId);
  return { ...result, checkoutUrl: validateHostedCheckoutUrl(result.checkoutUrl) };
}
export function redirectToInvoiceCheckout(url: string) { window.location.assign(validateHostedCheckoutUrl(url)); }
export function checkoutErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'functions/unauthenticated') return 'Sua sessão expirou. Entre novamente.';
  if (code === 'functions/permission-denied') return 'Você não tem permissão para pagar esta fatura.';
  if (code === 'functions/failed-precondition') return 'Checkout indisponível ou aguardando análise. Fale com a agência antes de tentar novamente.';
  return 'Não foi possível abrir o checkout. Tente novamente mais tarde ou fale com a agência.';
}
