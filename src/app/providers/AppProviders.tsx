import type { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import AppErrorBoundary from '../errors/AppErrorBoundary';
import ModalProvider from './ModalProvider';
import FeedbackProvider from './FeedbackProvider';

export default function AppProviders({ children }: { children: ReactNode }) {
  return <AppErrorBoundary><AuthProvider><ModalProvider><FeedbackProvider>{children}</FeedbackProvider></ModalProvider></AuthProvider></AppErrorBoundary>;
}
