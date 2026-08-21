export const FEATURES = Object.freeze({
  automatedPayments: false,
  invoiceDueSoonDays: 3,
});

export const AUTOMATED_PAYMENTS_ENABLED = FEATURES.automatedPayments;
export const INVOICE_DUE_SOON_DAYS = FEATURES.invoiceDueSoonDays;
export const AUTH_MODE = 'firebase-password' as const;
