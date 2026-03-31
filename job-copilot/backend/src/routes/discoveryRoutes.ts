import { Router } from 'express'
import { triggerManualDiscovery, getAllStoredJobs, getAPIStatus } from '../services/jobDiscovery'
import { notifyHighMatch } from '../services/notificationService'
import { loadProfile } from '../services/profileService'
import { scoreJob } from '../services/matchingEngine'
import fs from 'fs'
import path from 'path'

const router = Router()

// POST /api/discovery/run — déclenche une recherche d'offres réelles
router.post('/run', async (req, res) => {
  const profile = loadProfile()
  const skills = (req.body.skills ?? profile?.cv.skills ?? []) as string[]
  const result = await triggerManualDiscovery(skills)

  // Notify high matches if profile loaded
  if (profile) {
    const jobs = getAllStoredJobs()
    jobs
      .map(j => scoreJob(j, profile))
      .filter(j => j.matchScore >= 80)
      .slice(0, 3)
      .forEach(j => notifyHighMatch(j.title, j.company, j.matchScore, j.id))
  }

  res.json(result)
})

// GET /api/discovery/status — état des APIs et jobs stockés
router.get('/status', (_req, res) => {
  const jobs = getAllStoredJobs()
  const apiStatus = getAPIStatus()
  const bySource = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.source] = (acc[j.source] ?? 0) + 1
    return acc
  }, {})
  const lastFetch = jobs.length > 0
    ? jobs.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())[0].fetchedAt
    : null

  res.json({
    total: jobs.length,
    bySource,
    lastFetch,
    apis: {
      franceTravail: { active: apiStatus.franceTravail, label: 'France Travail (Pôle Emploi)', url: 'https://francetravail.io/data/api/offres-emploi' },
      adzuna: { active: apiStatus.adzuna, label: 'Adzuna (Indeed, Monster...)', url: 'https://developer.adzuna.com/' },
    },
    configured: apiStatus.franceTravail || apiStatus.adzuna,
  })
})

// POST /api/discovery/clear — vide la base et relance depuis les vraies APIs
router.post('/clear', async (req, res) => {
  const jobsFile = path.join(process.cwd(), 'data', 'jobs.json')
  fs.writeFileSync(jobsFile, '[]', 'utf-8')
  console.log('[Discovery] Base vidée')

  const profile = loadProfile()
  const skills = (req.body?.skills ?? profile?.cv.skills ?? process.env.INITIAL_SKILLS?.split(',') ?? []) as string[]
  const result = await triggerManualDiscovery(skills.map(s => s.trim()))
  res.json({ cleared: true, ...result })
})

export default router
