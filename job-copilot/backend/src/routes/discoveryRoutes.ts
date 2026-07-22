import { Router } from 'express'
import { getAllStoredJobs, dbInsertManyJobs, dbCountJobs } from '../services/jobDiscovery'
import { searchJobsWithGemini, type SearchCriteria } from '../services/jobSearchAgent'
import { notifyHighMatch } from '../services/notificationService'
import { loadProfile } from '../services/profileService'
import { scoreJob } from '../services/matchingEngine'
import pool from '../db/pgClient'

const router = Router()

// POST /api/discovery/run
// Body: { jobTitle, location, salary, contractType, remote, skills? }
router.post('/run', async (req, res) => {
  try {
    const profile = await loadProfile()

    const criteria: SearchCriteria = {
      // Données du CV (priorité au profil stocké)
      skills:          profile?.cv.skills          ?? req.body.skills ?? [],
      experience:      profile?.cv.experience       ?? [],
      languages:       profile?.cv.languages        ?? [],
      yearsExperience: profile?.cv.yearsExperience,
      // Préférences saisies par l'utilisateur
      jobTitle:     req.body.jobTitle    || profile?.cv.experience?.[0]?.title || '',
      location:     req.body.location    || 'France',
      salary:       req.body.salary,
      contractType: req.body.contractType,
      remote:       req.body.remote === true || req.body.remote === 'true',
    }

    console.log('[Discovery] Gemini search criteria:', {
      jobTitle: criteria.jobTitle,
      location: criteria.location,
      skills: criteria.skills.slice(0, 5),
    })

    const jobs = await searchJobsWithGemini(criteria)
    console.log(`[Discovery] Gemini returned ${jobs.length} job offers`)

    // Persist (dedup by id)
    const added = await dbInsertManyJobs(jobs)
    const total = await dbCountJobs()

    // Notifications pour les offres à fort matching
    if (profile) {
      jobs
        .map(j => scoreJob(j, profile))
        .filter(j => j.matchScore >= 80)
        .slice(0, 3)
        .forEach(j => notifyHighMatch(j.title, j.company, j.matchScore, j.id))
    }

    res.json({ added, total, sources: [`Gemini Search (${jobs.length})`] })
  } catch (err: any) {
    console.error('[Discovery] Erreur:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/discovery/status
router.get('/status', async (_req, res) => {
  try {
    const jobs = await getAllStoredJobs()
    res.json({
      total: jobs.length,
      bySource: { gemini_search: jobs.length },
      apis: { gemini: { active: !!process.env.GEMINI_API_KEY, label: 'Gemini 2.0 Flash + Google Search' } },
      configured: !!process.env.GEMINI_API_KEY,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/discovery/clear — vide et relance
router.post('/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM jobs')
    console.log('[Discovery] Table jobs vidée')

    const profile = await loadProfile()
    const criteria: SearchCriteria = {
      skills:          profile?.cv.skills    ?? req.body.skills ?? [],
      experience:      profile?.cv.experience ?? [],
      languages:       profile?.cv.languages  ?? [],
      yearsExperience: profile?.cv.yearsExperience,
      jobTitle:     req.body.jobTitle    || profile?.cv.experience?.[0]?.title || '',
      location:     req.body.location    || 'France',
      salary:       req.body.salary,
      contractType: req.body.contractType,
      remote:       req.body.remote === true,
    }

    const jobs = await searchJobsWithGemini(criteria)
    const added = await dbInsertManyJobs(jobs)
    const total = await dbCountJobs()

    res.json({ cleared: true, added, total })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
