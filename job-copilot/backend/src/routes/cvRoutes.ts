import { Router } from 'express'
import multer from 'multer'
import { parseCV, extractText } from '../services/cvParser'
import { saveProfile, loadProfile } from '../services/profileService'
import { triggerManualDiscovery } from '../services/scheduler'
import { notifyATSTip } from '../services/notificationService'
import { generateCVDocx } from '../services/cvDocxGenerator'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Format non supporté. Utilisez PDF ou DOCX.'))
  },
})

// POST /api/cv/upload
// 1. Parse CV
// 2. Save profile server-side
// 3. Trigger job discovery with real skills
router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' })

    // Step 1: Parse CV
    const parsed = await parseCV(req.file.buffer, req.file.mimetype)

    // Step 2: Save profile server-side (enables server-side matching)
    const profile = saveProfile(parsed)

    // Step 3: Trigger immediate job discovery with real CV skills
    // Run async without blocking the response
    triggerManualDiscovery(parsed.skills).then(({ added, total }) => {
      console.log(`[Pipeline] Discovery after CV upload: +${added} new jobs, ${total} total`)
    }).catch(err => {
      console.error('[Pipeline] Discovery error after upload:', err)
    })

    // Step 4: ATS tip notification if score is low
    if (parsed.atsScore < 50 && parsed.atsMissing.length > 0) {
      notifyATSTip(
        `Votre score ATS est ${parsed.atsScore}/100. Ajoutez ces mots-clés : ${parsed.atsMissing.slice(0, 3).join(', ')}.`
      )
    }

    return res.json({
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
      parsed,
      profile: {
        skillsCount: profile.skillsLower.length,
        keyTermsCount: profile.keyTerms.length,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur lors de l\'analyse du CV.' })
  }
})

// POST /api/cv/profile — save profile from frontend (when CV is in localStorage)
router.post('/profile', (req, res) => {
  const { cv } = req.body
  if (!cv) return res.status(400).json({ error: 'cv requis.' })
  const profile = saveProfile(cv)
  // Also trigger discovery
  triggerManualDiscovery(cv.skills ?? []).catch(() => {})
  return res.json({ success: true, skillsCount: profile.skillsLower.length })
})

// GET /api/cv/profile — get saved profile
router.get('/profile', (_req, res) => {
  const profile = loadProfile()
  if (!profile) return res.status(404).json({ error: 'Aucun profil sauvegardé.' })
  return res.json(profile)
})

// GET /api/cv/generate-docx — generate and download CV as Word document
router.get('/generate-docx', async (_req, res) => {
  try {
    const profile = loadProfile()
    if (!profile) return res.status(404).json({ error: 'Aucun profil sauvegardé. Uploadez votre CV d\'abord.' })

    const buffer = await generateCVDocx(profile)
    const safeName = (profile.cv.name || 'CV').replace(/\s+/g, '_')

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="CV_${safeName}.docx"`)
    res.setHeader('Content-Length', buffer.length)
    return res.send(buffer)
  } catch (err: any) {
    console.error('[CV] DOCX generation error:', err)
    return res.status(500).json({ error: 'Erreur lors de la génération du CV Word.' })
  }
})

// POST /api/cv/debug — returns raw extracted text
router.post('/debug', upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' })
  const text = await extractText(req.file.buffer, req.file.mimetype)
  return res.json({ text })
})

export default router
