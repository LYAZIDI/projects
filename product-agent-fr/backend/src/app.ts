import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import analyseRoutes from './routes/analyseRoutes'

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.use('/api/analyse', analyseRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ statut: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

export default app
