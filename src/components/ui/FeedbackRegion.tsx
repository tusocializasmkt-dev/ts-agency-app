import { Toaster } from 'react-hot-toast';

export default function FeedbackRegion() {
  return <Toaster position="top-right" toastOptions={{ style: { background: '#fff', color: '#000', border: '1px solid rgba(0,0,0,0.1)' } }} />;
}
