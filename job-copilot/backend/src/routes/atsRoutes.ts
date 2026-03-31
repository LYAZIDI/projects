import { Router } from 'express'
import { analyzeATSForJob, extractJobKeywords } from '../services/atsOptimizer'
import type { ParsedCV } from '../types'

const router = Router()

// POST /api/ats/analyze
// Body: { cv: ParsedCV, jobTitle: string, jobDescription: string }
router.post('/analyze', (req, res) => {
  const { cv, jobTitle, jobDescription } = req.body as {
    cv: ParsedCV
    jobTitle: string
    jobDescription: string
  }

  if (!cv || !jobTitle || !jobDescription) {
    return res.status(400).json({ error: 'cv, jobTitle et jobDescription sont requis.' })
  }

  const analysis = analyzeATSForJob(cv, jobTitle, jobDescription)
  return res.json(analysis)
})

// POST /api/ats/keywords
// Body: { jobDescription: string }
router.post('/keywords', (req, res) => {
  const { jobDescription } = req.body as { jobDescription: string }
  if (!jobDescription) return res.status(400).json({ error: 'jobDescription requis.' })
  return res.json({ keywords: extractJobKeywords(jobDescription) })
})

export default router
