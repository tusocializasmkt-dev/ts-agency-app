const configuredUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_APP_URL?.trim();
export const APP_URL = configuredUrl || (typeof window !== 'undefined' ? window.location.origin : '');
