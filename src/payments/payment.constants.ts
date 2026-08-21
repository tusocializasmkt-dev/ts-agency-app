export const PAYMENT_CURRENCY = 'BRL' as const;
export const ACTIVE_PAYMENT_STATUSES = ['created', 'pending', 'processing'] as const;
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 10_000;
export const PAYMENT_STATUS_POLL_MAX_ATTEMPTS = 30;
