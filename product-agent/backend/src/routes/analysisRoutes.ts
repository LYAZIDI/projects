import { Router } from 'express'
import multer from 'multer'
import { runPipeline } from '../orchestrator/pipeline'
import { extractFromImage, extractFromUrl } from '../agents/productExtractor'
import type { ProductInput } from '../agents/types'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function sse(res: any) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  return (event: string, data: object) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ── POST /api/extract/image — extract product info from uploaded image ────────
router.post('/extract/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' })
    const base64 = req.file.buffer.toString('base64')
    const mediaType = req.file.mimetype || 'image/jpeg'
    const product = await extractFromImage(base64, mediaType)
    return res.json({ success: true, product })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ── POST /api/extract/url — extract product info from URL ─────────────────────
router.post('/extract/url', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'url is required.' })
    const product = await extractFromUrl(url)
    return res.json({ success: true, product })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// ── POST /api/analyze/stream — image upload → full SSE pipeline ───────────────
router.post('/analyze/stream', upload.single('image'), async (req, res) => {
  const send = sse(res)

  try {
    let input: ProductInput

    if (req.file) {
      // Image mode
      send('progress', { step: 'extracting', progress: 3, label: 'Analyzing product image…' })
      const base64 = req.file.buffer.toString('base64')
      input = await extractFromImage(base64, req.file.mimetype || 'image/jpeg')
      send('extracted', { product: input })
    } else {
      // URL or manual mode
      const body = req.body
      if (body.url && !body.name) {
        send('progress', { step: 'extracting', progress: 3, label: 'Reading product URL…' })
        input = await extractFromUrl(body.url)
        send('extracted', { product: input })
      } else {
        input = body as ProductInput
        if (!input?.name || !input?.description) {
          send('error', { message: 'Provide an image, a URL, or name + description.' })
          return res.end()
        }
      }
    }

    send('progress', { step: 'product', progress: 10, label: 'Analyzing product…' })

    const result = await runPipeline(input, (step, progress) => {
      const labels: Record<string, string> = {
        product:  'Analyzing product…',
        market:   'Evaluating market…',
        avatar:   'Building customer avatar…',
        strategy: 'Generating strategy…',
        page:     'Writing product page…',
        ads:      'Creating ad campaigns…',
        content:  'Producing content plan…',
        score:    'Computing success score…',
        done:     'Done!',
      }
      send('progress', { step, progress, label: labels[step] ?? step })
    })

    send('complete', { result })
    res.end()
  } catch (err: any) {
    send('error', { message: err.message || 'Pipeline failed' })
    res.end()
  }
})

// ── GET /api/health ───────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING' })
})

export default router
