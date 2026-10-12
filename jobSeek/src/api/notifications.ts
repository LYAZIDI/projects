import { api } from './client'
import type { Notification } from '../types'

export async function fetchNotifications(): Promise<Notification[]> {
  const data = await api<any[]>('/api/notifications')
  return data.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.body ?? n.message ?? '',
    jobId: n.link?.split('/').pop(),
    read: n.read,
    createdAt: n.createdAt ?? n.created_at,
  }))
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await api<{ count: number }>('/api/notifications/unread-count')
  return data.count
}

export async function markAsRead(id: string): Promise<void> {
  await api(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllAsRead(): Promise<void> {
  await api('/api/notifications/read-all', { method: 'PATCH' })
}

export async function deleteNotification(id: string): Promise<void> {
  await api(`/api/notifications/${id}`, { method: 'DELETE' })
}
