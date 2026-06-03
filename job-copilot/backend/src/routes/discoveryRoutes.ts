import { Router } from 'express'
import { triggerManualDiscovery, getAllStoredJobs, getAPIStatus } from '../services/jobDiscovery'
import { notifyHighMatch } from '../services/notificationService'
import { loadProfile } from '../services/profileService'
import { scoreJob } from '../services/matchingEngine'
import pool from '../db/pgClient'

const router = Router()

// POST /api/discovery/run
router.post('/run', async (req, res) => {
  try {
    const profile = await loadProfile()
    const skills = (req.body.skills ?? profile?.cv.skills ?? []) as string[]
    const result = await triggerManualDiscovery(skills)

    if (profile) {
      const jobs = await getAllStoredJobs()
      jobs
        .map(j => scoreJob(j, profile))
        .filter(j => j.matchScore >= 80)
        .slice(0, 3)
        .forEach(j => notifyHighMatch(j.title, j.company, j.matchScore, j.id))
    }

    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/discovery/status
router.get('/status', async (_req, res) => {
  try {
    const jobs = await getAllStoredJobs()
    const apiStatus = getAPIStatus()
    const bySource = jobs.reduce<Record<string, number>>((acc, j) => {
      const src = (j as any).source ?? 'unknown'
      acc[src] = (acc[src] ?? 0) + 1
      return acc
    }, {})

    res.json({
      total: jobs.length,
      bySource,
      apis: {
        franceTravail: { active: apiStatus.franceTravail, label: 'France Travail (Pôle Emploi)' },
        adzuna: { active: apiStatus.adzuna, label: 'Adzuna (Indeed, Monster...)' },
      },
      configured: apiStatus.franceTravail || apiStatus.adzuna,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/discovery/clear — vide la table jobs et relance
router.post('/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM jobs')
    console.log('[Discovery] Table jobs vidée')
    const profile = await loadProfile()
    const skills = (req.body?.skills ?? profile?.cv.skills ?? process.env.INITIAL_SKILLS?.split(',') ?? []) as string[]
    const result = await triggerManualDiscovery(skills.map((s: string) => s.trim()))
    res.json({ cleared: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
