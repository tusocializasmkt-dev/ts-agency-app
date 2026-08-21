import type { Notification } from '../../types';
import NotificationItem from './NotificationItem';
export default function NotificationList({ notifications, onRead }: { notifications: Notification[]; onRead: (id: string) => Promise<void> }) { return <ul aria-label="Notificações" className="space-y-3">{notifications.map(item => <NotificationItem key={item.id} notification={item} onRead={onRead} />)}</ul>; }
