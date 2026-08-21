import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '../types';

const repositories = vi.hoisted(() => ({ createNotification: vi.fn(), listAdminUids: vi.fn(), subscribeToNotifications: vi.fn(), subscribeToUnreadCount: vi.fn(), markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn() }));
vi.mock('../data/repositories', () => repositories);
import { notifyPostApproved, notifyPostCreated, sendManualNotification, sendManualNotifications } from '../services/notifications.service';
import NotificationItem from '../components/notifications/NotificationItem';
import ManualNotificationDialog from '../components/notifications/ManualNotificationDialog';

describe('notificações', () => {
  beforeEach(() => { vi.clearAllMocks(); repositories.createNotification.mockResolvedValue('n'); repositories.listAdminUids.mockResolvedValue(['a1', 'a2']); });
  it('monta evento para cliente e para todos os admins', async () => { await notifyPostCreated('brand', 'post'); expect(repositories.createNotification).toHaveBeenCalledWith(expect.objectContaining({ recipientUid: 'brand', type: 'post_created', link: '/cliente/posts' })); await notifyPostApproved('brand', 'post'); expect(repositories.createNotification).toHaveBeenCalledWith(expect.objectContaining({ recipientUid: 'a1', type: 'post_approved' })); expect(repositories.createNotification).toHaveBeenCalledWith(expect.objectContaining({ recipientUid: 'a2' })); });
  it('valida notificação manual e bloqueia link externo', async () => { await expect(sendManualNotification('brand', ' Título ', ' Mensagem ', '/cliente/posts', 'admin')).resolves.toBe('n'); expect(repositories.createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'manual', title: 'Título', source: 'admin' })); await expect(sendManualNotification('brand', 'T', 'M', 'https://example.com', 'admin')).rejects.toThrow('Link interno'); });
  it('mostra estado não lido, marca e navega por ação acessível', async () => { const read = vi.fn().mockResolvedValue(undefined); const item: Notification = { id: 'n', recipientUid: 'u', type: 'post_created', title: 'Novo', message: 'Mensagem', link: '/cliente/posts', source: 'system', createdAt: new Date('2026-01-01') }; render(<MemoryRouter><NotificationItem notification={item} onRead={read} /></MemoryRouter>); expect(screen.getByText('Não lida')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Abrir' })); await waitFor(() => expect(read).toHaveBeenCalledWith('n')); });
  it('deduplica destinatários e permite selecionar todos os clientes', async () => { await sendManualNotifications(['b1', 'b1', 'b2'], 'Aviso', 'Mensagem', undefined, 'admin'); expect(repositories.createNotification).toHaveBeenCalledTimes(2); const confirm = vi.fn().mockResolvedValue(undefined); render(<ManualNotificationDialog brands={[{ id: 'b1', name: 'Um' }, { id: 'b2', name: 'Dois' }] as never} processing={false} onCancel={vi.fn()} onConfirm={confirm} />); fireEvent.click(screen.getByLabelText('Todos os clientes')); fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Aviso' } }); fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Mensagem' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' })); await waitFor(() => expect(confirm).toHaveBeenCalledWith(['b1', 'b2'], 'Aviso', 'Mensagem', undefined)); });
});
