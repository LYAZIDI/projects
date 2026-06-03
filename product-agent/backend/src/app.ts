import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import analysisRoutes from './routes/analysisRoutes'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const app = express()

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))

app.use('/api', analysisRoutes)

export default app
