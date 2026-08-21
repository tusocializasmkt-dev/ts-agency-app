import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Notification } from '../../types';
import { mapNotification, toNotificationWriteData } from '../mappers';
import { normalizeFirestoreError, subscribeToQuery, type DataListener, type ErrorListener } from '../firebase';
import { NOTIFICATION_LIST_LIMIT } from '../../notifications';

const notifications = collection(db, 'notifications');
type NewNotification = Omit<Notification, 'id' | 'createdAt' | 'readAt'>;
const recipientQuery = (recipientUid: string, count = NOTIFICATION_LIST_LIMIT) => query(notifications, where('recipientUid', '==', recipientUid), orderBy('createdAt', 'desc'), limit(count));
export const subscribeToNotifications = (recipientUid: string, onData: DataListener<Notification[]>, onError: ErrorListener, count = NOTIFICATION_LIST_LIMIT) => subscribeToQuery(recipientQuery(recipientUid, count), mapNotification, onData, onError, 'notification', 'subscribe');
export const subscribeToUnreadCount = (recipientUid: string, onData: DataListener<number>, onError: ErrorListener) => subscribeToQuery(query(notifications, where('recipientUid', '==', recipientUid), where('readAt', '==', null), limit(100)), mapNotification, items => onData(items.length), onError, 'notification', 'subscribe-unread');
export async function createNotification(payload: NewNotification): Promise<string> { try { const result = await addDoc(notifications, { ...toNotificationWriteData(payload), readAt: null, createdAt: serverTimestamp() }); return result.id; } catch (error) { throw normalizeFirestoreError(error, 'create', 'notification'); } }
export async function markNotificationAsRead(id: string, recipientUid: string): Promise<void> { try { await updateDoc(doc(db, 'notifications', id), { recipientUid, readAt: serverTimestamp() }); } catch (error) { throw normalizeFirestoreError(error, 'mark-read', 'notification'); } }
export async function markAllNotificationsAsRead(recipientUid: string): Promise<void> { try { const snapshot = await getDocs(query(notifications, where('recipientUid', '==', recipientUid), where('readAt', '==', null), limit(NOTIFICATION_LIST_LIMIT))); const batch = writeBatch(db); snapshot.docs.forEach(item => batch.update(item.ref, { readAt: serverTimestamp() })); await batch.commit(); } catch (error) { throw normalizeFirestoreError(error, 'mark-all-read', 'notification'); } }
export async function getRecentNotifications(recipientUid: string, count = NOTIFICATION_LIST_LIMIT): Promise<Notification[]> { try { return (await getDocs(recipientQuery(recipientUid, count))).docs.map(mapNotification); } catch (error) { throw normalizeFirestoreError(error, 'list', 'notification'); } }
export async function listAdminUids(): Promise<string[]> { try { return (await getDocs(collection(db, 'admins'))).docs.map(item => item.id); } catch (error) { throw normalizeFirestoreError(error, 'list', 'admin'); } }
