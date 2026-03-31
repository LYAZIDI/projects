import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

import cvRoutes from './routes/cvRoutes'
import jobRoutes from './routes/jobRoutes'
import notificationRoutes from './routes/notificationRoutes'
import atsRoutes from './routes/atsRoutes'
import discoveryRoutes from './routes/discoveryRoutes'
import { startScheduler } from './services/scheduler'

// Load .env — use process.cwd() instead of __dirname (tsx compatibility)
dotenv.config({ path: path.join(process.cwd(), '.env') })

const app = express()
const PORT = process.env.PORT || 3002
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '5mb' }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/cv', cvRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ats', atsRoutes)
app.use('/api/discovery', discoveryRoutes)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    modules: ['cv-parser', 'job-discovery', 'notifications', 'ats-optimizer', 'scheduler'],
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`JobCopilot API running on http://localhost:${PORT}`)
  console.log(`[Config] Adzuna: ${process.env.ADZUNA_APP_ID ? '✓ configuré' : '✗ non configuré'}`)
  console.log(`[Config] France Travail: ${process.env.FRANCE_TRAVAIL_CLIENT_ID ? '✓ configuré' : '✗ non configuré'}`)

  const initialSkills = process.env.INITIAL_SKILLS?.split(',').map(s => s.trim()) ?? []
  console.log(`[Config] Skills initiaux: ${initialSkills.join(', ') || 'aucun'}`)
  startScheduler(initialSkills)
})
