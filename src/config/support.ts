const agencyWhatsApp = '5511986237487';
const messages = {
  recovery: 'Olá! Preciso de ajuda para recuperar meu acesso ao TS Agency.',
  support: 'Olá! Preciso de suporte com o TS Agency.',
};
export const supportUrl = (context: keyof typeof messages = 'support') => `https://wa.me/${agencyWhatsApp}?text=${encodeURIComponent(messages[context])}`;
