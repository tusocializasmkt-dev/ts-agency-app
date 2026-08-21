import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GlobalModalProps {
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  onClose: () => void;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function GlobalModal({ title, children, size = 'md', closeOnOverlay = true, closeOnEscape = true, showCloseButton = true, onClose }: GlobalModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus.current?.focus(); };
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, onClose]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) { event.preventDefault(); return; }
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const overlayClick = (event: MouseEvent<HTMLDivElement>) => { if (closeOnOverlay && event.target === event.currentTarget) onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onMouseDown={overlayClick}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} onKeyDown={trapFocus} className={cn('max-h-[calc(100vh-2rem)] w-full overflow-y-auto bg-white border border-zinc-200 rounded-3xl shadow-2xl p-5 outline-none sm:p-8', sizes[size])}>
        {(title || showCloseButton) && <div className="flex items-center justify-between gap-6 mb-6">{title && <h2 id={titleId} className="text-2xl font-bold tracking-tight">{title}</h2>}{showCloseButton && <button type="button" onClick={onClose} aria-label="Fechar diálogo" className="ml-auto p-2 rounded-xl hover:bg-zinc-100"><X className="w-5 h-5" /></button>}</div>}
        {children}
      </div>
    </div>, document.body,
  );
}
