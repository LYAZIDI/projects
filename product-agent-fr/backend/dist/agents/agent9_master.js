"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScoreMaster = runScoreMaster;
const llm_1 = require("./llm");
const SYSTEME = `Tu es le MASTER AGENT d'évaluation produit pour le marché français.
Tu analyses tous les résultats des autres agents et tu rends un verdict final impartial.
Tu te bases sur des critères réels du marché français e-commerce 2024 :
marge minimale viable (>40%), ROAS TikTok/Meta attendu (>2.5x), potentiel de viralité française,
facilité de sourcing, durabilité du produit face à la saturation du marché.
Ton verdict est binaire et courageux : soit le produit vaut la peine d'être lancé, soit non.`;
async function runScoreMaster(produit, marche, avatar, strategie, offre) {
    const prompt = `Évalue ce produit de manière exhaustive et rends ton verdict final :

=== PRODUIT ===
Nom : ${produit.nom}
Catégorie : ${produit.categorie}
Bénéfice : ${produit.benefice_principal}
Est produit gagnant (auto-éval) : ${produit.est_produit_gagnant}
Potentiel viral : ${produit.potentiel_viral}
Facteur WOW : ${produit.facteur_wow}

=== MARCHÉ ===
Score demande : ${marche.score_demande}/100
Concurrence : ${marche.niveau_concurrence}
Saturation : ${marche.risque_saturation}
Tendance : ${marche.tendance}
Fenêtre opportunité : ${marche.fenetre_opportunite}
Barrières entrée : ${marche.barrieres_entree.join(', ')}

=== AVATAR ===
Confiance dropshipping : ${avatar.confiance_dropshipping}
Sensibilité prix : ${avatar.sensibilite_prix}
Déclencheurs : ${avatar.declencheurs_achat.join(', ')}

=== OFFRE ===
Prix psychologique : ${offre.prix_psychologique}€
Prix barré : ${offre.prix_barre}€
ROAS estimé : ${strategie.roas_estime}
Budget lancement : ${strategie.budget_lancement_recommande}

Retourne un objet JSON avec ce schéma exact :
{
  "score_global": 7.5,
  "verdict": "test",
  "indicateur": "🟡",
  "decision": "TESTER",
  "detail_scores": {
    "demande_marche": 8,
    "concurrence": 6,
    "marge_potentielle": 7,
    "potentiel_viral": 8,
    "facilite_lancement": 7,
    "adaptabilite_france": 9
  },
  "forces": ["Force 1 concrète", "Force 2", "Force 3"],
  "faiblesses": ["Faiblesse 1 concrète", "Faiblesse 2"],
  "plan_action_immediat": [
    {
      "priorite": 1,
      "action": "Action concrète et immédiate",
      "impact": "élevé",
      "delai": "Cette semaine",
      "budget_estime": "0€"
    },
    {
      "priorite": 2,
      "action": "Deuxième action",
      "impact": "élevé",
      "delai": "Semaine 2",
      "budget_estime": "500€"
    },
    {
      "priorite": 3,
      "action": "Troisième action",
      "impact": "moyen",
      "delai": "Mois 1",
      "budget_estime": "1000€"
    }
  ],
  "chiffre_affaires_estime": {
    "mois_1": "2 000 – 5 000€",
    "mois_3": "8 000 – 15 000€",
    "mois_6": "20 000 – 40 000€"
  },
  "seuil_rentabilite_unites": 45,
  "conseil_final": "Conseil final direct et actionnable en 2-3 phrases"
}

Règles de verdict :
- score >= 8.0 → verdict "gagnant", indicateur "🟢", decision "LANCER"
- score 6.5-7.9 → verdict "test", indicateur "🟡", decision "TESTER"
- score 5.0-6.4 → verdict "risqué", indicateur "🔴", decision "AFFINER"
- score < 5.0 → verdict "éviter", indicateur "🔴", decision "ABANDONNER"`;
    return (0, llm_1.appelAgent)(SYSTEME, prompt, 2500);
}
//# sourceMappingURL=agent9_master.js.map