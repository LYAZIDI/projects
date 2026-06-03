import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const API = ''

export interface AppNotification {
  id: string
  type: 'new_job' | 'high_match' | 'follow_up' | 'interview' | 'ats_tip'
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const refresh = useCallback(async () => {
    try {
      const data = await fetch(`${API}/api/notifications`).then(r => r.json())
      if (Array.isArray(data)) setNotifications(data)
    } catch { /* backend not running, silent fail */ }
  }, [])

  // Poll every 30s for new notifications
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const unreadCount = notifications.filter(n => !n.read).length

  async function markRead(id: string) {
    await fetch(`${API}/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch(`${API}/api/notifications/read-all`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function remove(id: string) {
    await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, remove, refresh }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
