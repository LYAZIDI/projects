"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalyseMarche = runAnalyseMarche;
const llm_1 = require("./llm");
const SYSTEME = `Tu es un analyste marché spécialisé dans le e-commerce français et francophone.
Tu connais parfaitement les comportements d'achat en France : méfiance envers les produits sans marque,
importance des avis clients, sensibilité au prix, popularité des marketplaces (Amazon FR, Cdiscount, Vinted).
Tu identifies les opportunités concrètes et les risques réels sur le marché français.`;
async function runAnalyseMarche(produit) {
    const prompt = `Évalue le potentiel marché en France pour ce produit :

Produit : ${produit.nom}
Catégorie : ${produit.categorie}
Bénéfice principal : ${produit.benefice_principal}
Problème résolu : ${produit.probleme_resolu}
Cible : ${produit.cible_principale}
Mots-clés : ${produit.mots_cles_concurrents.join(', ')}
Potentiel viral : ${produit.potentiel_viral}

Retourne un objet JSON avec ce schéma exact :
{
  "score_demande": 72,
  "niveau_concurrence": "moyen",
  "risque_saturation": "faible",
  "tendance": "croissante",
  "recherches_mensuelles_estimees": 45000,
  "marches_prioritaires": ["France", "Belgique", "Suisse", "Canada francophone"],
  "saisonnalite": "description de la saisonnalité pour le marché français",
  "fenetre_opportunite": "durée estimée avant saturation du marché",
  "taille_marche_estime": "X millions d'euros",
  "barrieres_entree": ["barrière 1", "barrière 2"],
  "insights_cles": ["insight 1 spécifique au marché FR", "insight 2", "insight 3"],
  "plateformes_fr_pertinentes": ["TikTok FR", "Instagram", "Amazon.fr", "autre"]
}`;
    return (0, llm_1.appelAgent)(SYSTEME, prompt, 1500);
}
//# sourceMappingURL=agent2_analyseMarche.js.map