import type { ReactNode } from 'react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackMessage {
  id?: string;
  type: FeedbackType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface FeedbackOptions extends Omit<FeedbackMessage, 'id' | 'type' | 'title'> {
  id?: string;
}

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  destructive?: boolean;
}

export interface ModalOptions {
  title?: string;
  content: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}
