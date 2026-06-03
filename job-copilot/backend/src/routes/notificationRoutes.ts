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
router.get('/', async (_req, res, next) => {
  try {
    res.json(await getAllNotifications())
  } catch (err) { next(err) }
})

// GET /api/notifications/unread-count
router.get('/unread-count', async (_req, res, next) => {
  try {
    res.json({ count: await getUnreadCount() })
  } catch (err) { next(err) }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const ok = await markAsRead(req.params.id)
    res.json({ success: ok })
  } catch (err) { next(err) }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', async (_req, res, next) => {
  try {
    await markAllAsRead()
    res.json({ success: true })
  } catch (err) { next(err) }
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deleteNotification(req.params.id)
    res.json({ success: ok })
  } catch (err) { next(err) }
})

export default router
