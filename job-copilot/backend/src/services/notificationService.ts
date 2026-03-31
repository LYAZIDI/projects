/**
 * Notification Service
 * Types : new_job, high_match, follow_up, interview, ats_tip
 */
import { randomUUID } from 'crypto'
import { dbGetAll, dbInsert, dbUpdate, dbDelete } from '../db/fileDb'
import type { Notification, NotificationType } from '../types'

export function createNotification(data: {
  type: NotificationType
  title: string
  body: string
  link?: string
}): Notification {
  const notif: Notification = {
    id: randomUUID(),
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link,
    read: false,
    createdAt: new Date().toISOString(),
  }
  return dbInsert('notifications', notif)
}

export function getAllNotifications(): Notification[] {
  return dbGetAll<Notification>('notifications')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getUnreadCount(): number {
  return dbGetAll<Notification>('notifications').filter(n => !n.read).length
}

export function markAsRead(id: string): boolean {
  return dbUpdate('notifications', id, { read: true } as any)
}

export function markAllAsRead(): void {
  const all = dbGetAll<Notification>('notifications')
  all.forEach(n => dbUpdate('notifications', n.id, { read: true } as any))
}

export function deleteNotification(id: string): boolean {
  return dbDelete('notifications', id)
}

// ─── Automatic notification rules ────────────────────────────────────────────

// Called when a high-match job is found
export function notifyHighMatch(jobTitle: string, company: string, score: number, jobId: string) {
  if (score < 85) return
  createNotification({
    type: 'high_match',
    title: `Match ${score}% — ${jobTitle} chez ${company}`,
    body: `Cette offre correspond fortement à votre profil. Préparez votre candidature maintenant.`,
    link: `/apply/${jobId}`,
  })
}

// Called when a candidate has been "applied" for > 7 days without response
export function notifyFollowUp(company: string, jobTitle: string) {
  createNotification({
    type: 'follow_up',
    title: `Relance recommandée — ${company}`,
    body: `Votre candidature pour "${jobTitle}" est sans réponse depuis 7 jours. Un email de relance peut augmenter vos chances de 30%.`,
    link: '/dashboard',
  })
}

// ATS tip notification
export function notifyATSTip(tip: string) {
  createNotification({
    type: 'ats_tip',
    title: 'Conseil ATS',
    body: tip,
    link: '/ats-optimizer',
  })
}
