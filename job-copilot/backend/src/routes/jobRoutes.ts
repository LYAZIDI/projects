import { Router } from 'express'
import { getAllStoredJobs } from '../services/jobDiscovery'
import { loadProfile } from '../services/profileService'
import { runMatchingPipeline, scoreJob } from '../services/matchingEngine'
import { computeMatchFromSkills } from '../services/matcher'
import type { Job } from '../types'

const router = Router()

const FALLBACK_JOBS: Job[] = [
  { id: 'mock_1',  source: 'mock', title: 'Chauffeur VTC',           company: 'Uber',       location: 'Paris (75)',             description: 'Conduite de passagers en VTC.', salary: '1 800 – 2 800 €/mois', type: 'Freelance', remote: false, tags: ['Chauffeur', 'VTC', 'Permis B', 'Conduite', 'Relation client'], url: 'https://www.uber.com/fr/fr/drive/', logo: 'U', postedAt: "Aujourd'hui",  fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_2',  source: 'mock', title: 'Chauffeur Livreur Colis', company: 'Chronopost', location: 'Seine-Saint-Denis (93)', description: 'Livraison de colis en tournée.',salary: '1 900 – 2 200 €/mois', type: 'CDI',       remote: false, tags: ['Livraison', 'Permis B', 'Manutention', 'Tournées'],           url: 'https://www.chronopost.fr/',       logo: 'C', postedAt: 'il y a 1 jour', fetchedAt: new Date().toISOString(), matchScore: 0 },
  { id: 'mock_5',  source: 'mock', title: 'Développeur React Senior', company: 'Qonto',     location: 'Paris (75)',             description: 'Frontend React TypeScript.',    salary: '60 000 – 75 000 €/an', type: 'CDI',       remote: true,  tags: ['React', 'TypeScript', 'Node.js', 'Git', 'Agile'],             url: 'https://jobs.qonto.com/',          logo: 'Q', postedAt: 'il y a 1 jour', fetchedAt: new Date().toISOString(), matchScore: 0 },
]

// GET /api/jobs/matched
router.get('/matched', async (_req, res) => {
  try {
    const profile = await loadProfile()
    const stored = await getAllStoredJobs()
    const jobs = stored.length > 0 ? stored : FALLBACK_JOBS

    if (!profile) {
      return res.json({
        hasProfile: false,
        excellent: [], faible: [],
        bon: jobs.slice(0, 5).map(j => ({ ...j, matchScore: 50, matchCategory: 'bon', matchedSkills: [], missingSkills: j.tags, matchReason: 'Chargez votre CV pour voir votre score.' })),
        total: jobs.length, profileName: null, skillsUsed: [], scoredAt: new Date().toISOString(),
      })
    }
    return res.json({ hasProfile: true, ...runMatchingPipeline(jobs, profile) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/jobs
router.get('/', async (req, res) => {
  try {
    const skillsParam = req.query.skills as string | undefined
    const remoteOnly = req.query.remote === 'true'
    const minScore = parseInt(req.query.minScore as string) || 0
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const userSkills = skillsParam ? skillsParam.split(',').map(s => s.trim()).filter(Boolean) : []

    const profile = await loadProfile()
    const stored = await getAllStoredJobs()
    let jobs = stored.length > 0 ? stored : FALLBACK_JOBS

    if (profile) {
      jobs = jobs.map(job => ({ ...scoreJob(job, profile) }))
    } else if (userSkills.length > 0) {
      jobs = jobs.map(job => ({
        ...job,
        matchScore: computeMatchFromSkills(userSkills, job.tags),
        matchedSkills: job.tags.filter((t: string) => userSkills.some(s => t.toLowerCase().includes(s.toLowerCase()))),
        missingSkills: job.tags.filter((t: string) => !userSkills.some(s => t.toLowerCase().includes(s.toLowerCase()))),
      }))
    } else {
      jobs = jobs.map(j => ({ ...j, matchScore: 50, matchedSkills: [], missingSkills: j.tags }))
    }

    if (remoteOnly) jobs = jobs.filter(j => j.remote)
    if (minScore > 0) jobs = jobs.filter(j => j.matchScore >= minScore)
    jobs.sort((a, b) => b.matchScore - a.matchScore)
    return res.json(jobs.slice(0, limit))
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const stored = await getAllStoredJobs()
    const jobPool = stored.length > 0 ? stored : FALLBACK_JOBS
    const job = jobPool.find(j => j.id === req.params.id)
    if (!job) return res.status(404).json({ error: 'Offre non trouvée.' })
    const profile = await loadProfile()
    if (profile) return res.json(scoreJob(job, profile))
    return res.json(job)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
