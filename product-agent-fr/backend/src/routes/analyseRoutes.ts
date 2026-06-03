import { Router, Request, Response } from 'express'
import multer from 'multer'
import { lancerPipeline } from '../orchestrator/pipeline'
import { appelAgentVision } from '../agents/llm'
import type { ProduitInput } from '../agents/types'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /api/analyse/lancer — SSE streaming pipeline
router.post('/lancer', upload.single('image'), async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const envoyer = (evenement: string, donnees: unknown) => {
    res.write(`event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`)
  }

  try {
    let input: ProduitInput

    if (req.file) {
      // Mode image — extraction via Claude Vision
      const imageBase64 = req.file.buffer.toString('base64')
      const imageMimeType = req.file.mimetype

      envoyer('progres', { etape: 0, total: 9, nom: 'Extraction image', statut: 'en_cours' })

      const extrait = await appelAgentVision<Partial<ProduitInput>>(
        `Tu es un expert e-commerce. Analyse cette image de produit et extrait les informations clés.
        Réponds UNIQUEMENT en JSON valide.`,
        `Extrait de cette image de produit :
        {
          "nom": "nom du produit visible",
          "description": "description détaillée basée sur l'image",
          "categorie": "catégorie du produit"
        }`,
        imageBase64,
        imageMimeType,
        512
      )

      envoyer('progres', { etape: 0, total: 9, nom: 'Extraction image', statut: 'termine', donnees: extrait })

      input = {
        nom: extrait.nom || 'Produit analysé',
        description: extrait.description || 'Produit extrait depuis image',
        categorie: extrait.categorie,
        imageBase64,
        imageMimeType,
      }
    } else {
      // Mode formulaire / URL
      const body = req.body
      input = {
        nom: body.nom || '',
        description: body.description || '',
        url: body.url,
        prix: body.prix ? parseFloat(body.prix) : undefined,
        categorie: body.categorie,
      }
    }

    const resultat = await lancerPipeline(input, (etape) => {
      envoyer('progres', etape)
    })

    envoyer('termine', resultat)
    res.end()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    envoyer('erreur', { message })
    res.end()
  }
})

// POST /api/analyse/extraire-url — extrait infos produit depuis URL
router.post('/extraire-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ erreur: 'URL manquante' })

    // On demande à Claude d'analyser l'URL directement
    const extrait = await appelAgentVision<Partial<ProduitInput>>(
      `Tu es un expert e-commerce. Analyse cette URL de produit.`,
      `Depuis l'URL "${url}", deduis les informations produit :
      {
        "nom": "nom probable du produit",
        "description": "description déduite depuis l'URL",
        "categorie": "catégorie probable"
      }`,
      '',
      'image/jpeg',
      512
    ).catch(() => ({ nom: url, description: url, categorie: undefined }))

    res.json(extrait)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    res.status(500).json({ erreur: message })
  }
})

export default router
