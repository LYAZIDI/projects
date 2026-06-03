import { randomUUID } from 'crypto'
import pool from '../db/pgClient'

export type NotificationType = 'new_job' | 'high_match' | 'follow_up' | 'interview' | 'ats_tip'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export async function createNotification(data: {
  type: NotificationType
  title: string
  body: string
  link?: string
}): Promise<Notification> {
  const id = randomUUID()
  await pool.query(
    `INSERT INTO notifications (id, type, title, body, link, read, created_at)
     VALUES ($1,$2,$3,$4,$5,false,NOW())`,
    [id, data.type, data.title, data.body, data.link ?? null]
  )
  return { id, ...data, read: false, createdAt: new Date().toISOString() }
}

export async function getAllNotifications(): Promise<Notification[]> {
  const { rows } = await pool.query(
    `SELECT * FROM notifications ORDER BY created_at DESC`
  )
  return rows.map(r => ({
    id: r.id, type: r.type, title: r.title, body: r.body,
    link: r.link, read: r.read, createdAt: r.created_at,
  }))
}

export async function getUnreadCount(): Promise<number> {
  const { rows } = await pool.query(`SELECT COUNT(*) FROM notifications WHERE read = false`)
  return parseInt(rows[0].count, 10)
}

export async function markAsRead(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET read=true WHERE id=$1`, [id]
  )
  return (rowCount ?? 0) > 0
}

export async function markAllAsRead(): Promise<void> {
  await pool.query(`UPDATE notifications SET read=true`)
}

export async function deleteNotification(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM notifications WHERE id=$1`, [id])
  return (rowCount ?? 0) > 0
}

export function notifyHighMatch(jobTitle: string, company: string, score: number, jobId: string) {
  if (score < 85) return
  createNotification({
    type: 'high_match',
    title: `Match ${score}% — ${jobTitle} chez ${company}`,
    body: `Cette offre correspond fortement à votre profil. Préparez votre candidature maintenant.`,
    link: `/apply/${jobId}`,
  }).catch(() => {})
}

export function notifyFollowUp(company: string, jobTitle: string) {
  createNotification({
    type: 'follow_up',
    title: `Relance recommandée — ${company}`,
    body: `Votre candidature pour "${jobTitle}" est sans réponse depuis 7 jours.`,
    link: '/dashboard',
  }).catch(() => {})
}

export function notifyATSTip(tip: string) {
  createNotification({
    type: 'ats_tip',
    title: 'Conseil ATS',
    body: tip,
    link: '/ats-optimizer',
  }).catch(() => {})
}
