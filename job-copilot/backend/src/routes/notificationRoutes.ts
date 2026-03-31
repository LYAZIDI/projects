import { Router } from 'express'
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notificationService'

const router = Router()

// GET /api/notifications
router.get('/', (_req, res) => {
  res.json(getAllNotifications())
})

// GET /api/notifications/unread-count
router.get('/unread-count', (_req, res) => {
  res.json({ count: getUnreadCount() })
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  const ok = markAsRead(req.params.id)
  res.json({ success: ok })
})

// PATCH /api/notifications/read-all
router.patch('/read-all', (_req, res) => {
  markAllAsRead()
  res.json({ success: true })
})

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  const ok = deleteNotification(req.params.id)
  res.json({ success: ok })
})

export default router
