import app from './app'
import { startScheduler } from './services/scheduler'

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
  console.log(`JobCopilot API running on http://localhost:${PORT}`)
  console.log(`[Config] Adzuna: ${process.env.ADZUNA_APP_ID ? '✓ configuré' : '✗ non configuré'}`)
  console.log(`[Config] France Travail: ${process.env.FRANCE_TRAVAIL_CLIENT_ID ? '✓ configuré' : '✗ non configuré'}`)

  const initialSkills = process.env.INITIAL_SKILLS?.split(',').map(s => s.trim()) ?? []
  console.log(`[Config] Skills initiaux: ${initialSkills.join(', ') || 'aucun'}`)
  startScheduler(initialSkills)
})
