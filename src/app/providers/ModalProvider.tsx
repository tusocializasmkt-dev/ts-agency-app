import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ConfirmDialogOptions, ModalOptions } from '../../ui/ui.types';
import GlobalModal from '../../components/ui/GlobalModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

type ActiveModal = { kind: 'custom'; options: ModalOptions } | { kind: 'confirm'; options: ConfirmDialogOptions };
export interface ModalContextValue { openModal: (options: ModalOptions) => void; closeModal: () => void; closeAll: () => void; confirm: (options: ConfirmDialogOptions) => Promise<boolean>; }
export const ModalContext = createContext<ModalContextValue | null>(null);

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const resolveConfirmation = useCallback((value: boolean) => { resolver.current?.(value); resolver.current = null; }, []);
  const closeModal = useCallback(() => { resolveConfirmation(false); setActive(null); }, [resolveConfirmation]);
  const openModal = useCallback((options: ModalOptions) => { resolveConfirmation(false); setActive({ kind: 'custom', options }); }, [resolveConfirmation]);
  const confirm = useCallback((options: ConfirmDialogOptions) => { resolveConfirmation(false); setActive({ kind: 'confirm', options }); return new Promise<boolean>(resolve => { resolver.current = resolve; }); }, [resolveConfirmation]);
  const accept = useCallback(() => { resolveConfirmation(true); setActive(null); }, [resolveConfirmation]);
  useEffect(() => () => resolveConfirmation(false), [resolveConfirmation]);
  const value = useMemo<ModalContextValue>(() => ({ openModal, closeModal, closeAll: closeModal, confirm }), [openModal, closeModal, confirm]);

  return <ModalContext.Provider value={value}>{children}{active?.kind === 'custom' && <GlobalModal title={active.options.title} size={active.options.size} closeOnOverlay={active.options.closeOnOverlay} closeOnEscape={active.options.closeOnEscape} showCloseButton={active.options.showCloseButton} onClose={closeModal}>{active.options.content}</GlobalModal>}{active?.kind === 'confirm' && <ConfirmDialog options={active.options} onConfirm={accept} onCancel={closeModal} />}</ModalContext.Provider>;
}
