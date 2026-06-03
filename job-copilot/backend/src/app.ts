import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

import cvRoutes from './routes/cvRoutes'
import jobRoutes from './routes/jobRoutes'
import notificationRoutes from './routes/notificationRoutes'
import atsRoutes from './routes/atsRoutes'
import discoveryRoutes from './routes/discoveryRoutes'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const app = express()

// CORS — allow same-origin in production, localhost in dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3002',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (serverless, curl) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '5mb' }))

app.use('/api/cv',            cvRoutes)
app.use('/api/jobs',          jobRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ats',           atsRoutes)
app.use('/api/discovery',     discoveryRoutes)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    db: process.env.DATABASE_URL ? 'configured' : 'MISSING',
  })
})

export default app
