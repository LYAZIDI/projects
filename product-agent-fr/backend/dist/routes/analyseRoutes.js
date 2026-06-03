"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pipeline_1 = require("../orchestrator/pipeline");
const llm_1 = require("../agents/llm");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
// POST /api/analyse/lancer — SSE streaming pipeline
router.post('/lancer', upload.single('image'), async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    const envoyer = (evenement, donnees) => {
        res.write(`event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`);
    };
    try {
        let input;
        if (req.file) {
            // Mode image — extraction via Claude Vision
            const imageBase64 = req.file.buffer.toString('base64');
            const imageMimeType = req.file.mimetype;
            envoyer('progres', { etape: 0, total: 9, nom: 'Extraction image', statut: 'en_cours' });
            const extrait = await (0, llm_1.appelAgentVision)(`Tu es un expert e-commerce. Analyse cette image de produit et extrait les informations clés.
        Réponds UNIQUEMENT en JSON valide.`, `Extrait de cette image de produit :
        {
          "nom": "nom du produit visible",
          "description": "description détaillée basée sur l'image",
          "categorie": "catégorie du produit"
        }`, imageBase64, imageMimeType, 512);
            envoyer('progres', { etape: 0, total: 9, nom: 'Extraction image', statut: 'termine', donnees: extrait });
            input = {
                nom: extrait.nom || 'Produit analysé',
                description: extrait.description || 'Produit extrait depuis image',
                categorie: extrait.categorie,
                imageBase64,
                imageMimeType,
            };
        }
        else {
            // Mode formulaire / URL
            const body = req.body;
            input = {
                nom: body.nom || '',
                description: body.description || '',
                url: body.url,
                prix: body.prix ? parseFloat(body.prix) : undefined,
                categorie: body.categorie,
            };
        }
        const resultat = await (0, pipeline_1.lancerPipeline)(input, (etape) => {
            envoyer('progres', etape);
        });
        envoyer('termine', resultat);
        res.end();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        envoyer('erreur', { message });
        res.end();
    }
});
// POST /api/analyse/extraire-url — extrait infos produit depuis URL
router.post('/extraire-url', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url)
            return res.status(400).json({ erreur: 'URL manquante' });
        // On demande à Claude d'analyser l'URL directement
        const extrait = await (0, llm_1.appelAgentVision)(`Tu es un expert e-commerce. Analyse cette URL de produit.`, `Depuis l'URL "${url}", deduis les informations produit :
      {
        "nom": "nom probable du produit",
        "description": "description déduite depuis l'URL",
        "categorie": "catégorie probable"
      }`, '', 'image/jpeg', 512).catch(() => ({ nom: url, description: url, categorie: undefined }));
        res.json(extrait);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        res.status(500).json({ erreur: message });
    }
});
exports.default = router;
//# sourceMappingURL=analyseRoutes.js.map