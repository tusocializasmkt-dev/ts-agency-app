import type { Notification, NotificationType } from '../types';
import { createNotification, listAdminUids, markAllNotificationsAsRead, markNotificationAsRead, subscribeToNotifications, subscribeToUnreadCount } from '../data/repositories';
import { isAllowedNotificationRoute, NOTIFICATION_MESSAGE_MAX_LENGTH, NOTIFICATION_TITLE_MAX_LENGTH } from '../notifications';

export const watchNotifications = subscribeToNotifications;
export const watchUnreadNotificationCount = subscribeToUnreadCount;
export const markAsRead = markNotificationAsRead;
export const markAllAsRead = markAllNotificationsAsRead;
type Template = Pick<Notification, 'title' | 'message' | 'link'>;
const templates: Record<Exclude<NotificationType, 'manual'>, Template> = {
  post_created: { title: 'Novo conteúdo para aprovação', message: 'Um novo conteúdo está aguardando sua aprovação.', link: '/cliente/posts' },
  post_approved: { title: 'Conteúdo aprovado', message: 'O cliente aprovou um conteúdo.', link: '/admin/posts' },
  post_rejected: { title: 'Conteúdo reprovado', message: 'O cliente reprovou um conteúdo e enviou um feedback.', link: '/admin/posts' },
  post_changes_requested: { title: 'Ajustes solicitados', message: 'O cliente solicitou alterações em um conteúdo.', link: '/admin/posts' },
  post_resubmitted: { title: 'Conteúdo atualizado', message: 'O conteúdo foi atualizado e está aguardando uma nova análise.', link: '/cliente/posts' },
  invoice_created: { title: 'Nova fatura disponível', message: 'Uma nova fatura foi adicionada à sua área financeira.', link: '/cliente/financeiro' },
  payment_confirmed: { title: 'Pagamento confirmado', message: 'Uma fatura foi marcada como paga.', link: '/cliente/financeiro' },
  payment_promise_requested: { title: 'Promessa de pagamento solicitada', message: 'Um cliente enviou uma promessa de pagamento.', link: '/admin/financeiro' },
  payment_promise_approved: { title: 'Promessa aprovada', message: 'Sua promessa de pagamento foi aprovada.', link: '/cliente/financeiro' },
  payment_promise_rejected: { title: 'Promessa não aprovada', message: 'Sua promessa de pagamento foi analisada. Consulte a fatura.', link: '/cliente/financeiro' },
};
async function notify(recipientUid: string, brandId: string, entityId: string, type: Exclude<NotificationType, 'manual'>, entityType: 'post' | 'invoice' = 'post') { return createNotification({ recipientUid, brandId, type, ...templates[type], entityType, entityId, source: 'system' }); }
async function notifyAdmins(brandId: string, postId: string, type: 'post_approved' | 'post_rejected' | 'post_changes_requested') { const uids = await listAdminUids(); await Promise.all(uids.map(uid => notify(uid, brandId, postId, type))); }
export const notifyPostCreated = (brandId: string, postId: string) => notify(brandId, brandId, postId, 'post_created');
export const notifyPostApproved = (brandId: string, postId: string) => notifyAdmins(brandId, postId, 'post_approved');
export const notifyPostRejected = (brandId: string, postId: string) => notifyAdmins(brandId, postId, 'post_rejected');
export const notifyPostChangesRequested = (brandId: string, postId: string) => notifyAdmins(brandId, postId, 'post_changes_requested');
export const notifyPostResubmitted = (brandId: string, postId: string) => notify(brandId, brandId, postId, 'post_resubmitted');
export const notifyInvoiceCreated = (brandId: string, invoiceId: string) => notify(brandId, brandId, invoiceId, 'invoice_created', 'invoice');
export const notifyPaymentConfirmed = (brandId: string, invoiceId: string) => notify(brandId, brandId, invoiceId, 'payment_confirmed', 'invoice');
export const notifyPaymentPromiseApproved = (brandId: string, invoiceId: string) => notify(brandId, brandId, invoiceId, 'payment_promise_approved', 'invoice');
export const notifyPaymentPromiseRejected = (brandId: string, invoiceId: string) => notify(brandId, brandId, invoiceId, 'payment_promise_rejected', 'invoice');
export async function sendManualNotification(recipientUid: string, title: string, message: string, link: string | undefined, createdBy: string) { const cleanTitle = title.trim(); const cleanMessage = message.trim(); if (!recipientUid || !createdBy || !cleanTitle || cleanTitle.length > NOTIFICATION_TITLE_MAX_LENGTH || !cleanMessage || cleanMessage.length > NOTIFICATION_MESSAGE_MAX_LENGTH) throw new Error('Dados de notificação inválidos.'); if (link && !isAllowedNotificationRoute(link)) throw new Error('Link interno inválido.'); return createNotification({ recipientUid, brandId: recipientUid, type: 'manual', title: cleanTitle, message: cleanMessage, link: link || undefined, createdBy, source: 'admin' }); }
export async function sendManualNotifications(recipientUids: string[], title: string, message: string, link: string | undefined, createdBy: string) { const unique = [...new Set(recipientUids.filter(Boolean))]; if (!unique.length) throw new Error('Selecione ao menos um cliente.'); return Promise.all(unique.map(uid => sendManualNotification(uid, title, message, link, createdBy))); }
