import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlobalModal from '../components/ui/GlobalModal';
import type { Notification } from '../types';
import { dismissPopup, watchPopups } from './service';
export default function AnnouncementPopup() {
  const { user, role } = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems([]); setHidden([]);
    if (role !== 'client' || !user) return;
    const key = `ts-communication-dismissed:${user.uid}`;
    let local: string[] = [];
    try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(stored)) local = stored.filter(i => typeof i === 'string'); } catch { /* Server remains authoritative. */ }
    setHidden(local);
    return watchPopups(user.uid, next => {
      setItems(next);
      for (const notification of next) if (local.includes(notification.id)) void dismissPopup(notification.id).catch(() => {});
    }, () => setItems([]));
  }, [user?.uid, role]);
  const item = items.find(i => !hidden.includes(i.id));
  const close = async () => {
    if (!item || !user) return;
    const next = [...hidden, item.id];
    setHidden(next);
    try { localStorage.setItem(`ts-communication-dismissed:${user.uid}`, JSON.stringify(next)); } catch { /* A successful server write still persists the dismissal. */ }
    try { await dismissPopup(item.id); setError(''); } catch { setError('Dispensa salva neste dispositivo; será sincronizada no próximo acesso.'); }
  };
  if (!item || role !== 'client') return null;
  return <GlobalModal title={item.title} onClose={() => void close()}><div className="space-y-4">{item.imageUrl && <img src={item.imageUrl} alt="Imagem do comunicado" className="max-h-80 w-full rounded-xl object-contain" />}<p className="whitespace-pre-wrap break-words">{item.message}</p>{error && <p role="alert">{error}</p>}<button className="min-h-11 rounded-xl border px-4" onClick={() => { void close(); navigate('/cliente/notificacoes'); }}>Visualizar conteúdo completo</button><button className="min-h-11 rounded-xl border px-4" onClick={() => void close()}>Dispensar</button></div></GlobalModal>;
}
