import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { FeedbackOptions, FeedbackType } from '../../ui/ui.types';
import FeedbackRegion from '../../components/ui/FeedbackRegion';

export interface FeedbackContextValue {
  success: (title: string, options?: FeedbackOptions) => string;
  error: (title: string, options?: FeedbackOptions) => string;
  warning: (title: string, options?: FeedbackOptions) => string;
  info: (title: string, options?: FeedbackOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export default function FeedbackProvider({ children }: { children: ReactNode }) {
  const show = useCallback((type: FeedbackType, title: string, options: FeedbackOptions = {}) => {
    const message = options.description ? `${title}\n${options.description}` : title;
    const id = options.id ?? `${type}:${title}:${options.description ?? ''}`;
    const settings = { id, duration: options.duration };
    if (type === 'success') return toast.success(message, settings);
    if (type === 'error') return toast.error(message, settings);
    if (type === 'warning') return toast(message, { ...settings, icon: '⚠️' });
    return toast(message, settings);
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({
    success: (title, options) => show('success', title, options),
    error: (title, options) => show('error', title, options),
    warning: (title, options) => show('warning', title, options),
    info: (title, options) => show('info', title, options),
    dismiss: id => toast.dismiss(id),
    dismissAll: () => toast.dismiss(),
  }), [show]);

  return <FeedbackContext.Provider value={value}>{children}<FeedbackRegion /></FeedbackContext.Provider>;
}
