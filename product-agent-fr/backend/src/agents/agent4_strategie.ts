import { appelAgent } from './llm'
import type { AnalyseProduit, AnalyseMarche, AvatarClient, StrategieMarketing } from './types'

const SYSTEME = `Tu es un stratège marketing digital expert en e-commerce français.
Tu crées des stratégies de lancement concrètes, adaptées au budget réel d'un entrepreneur qui démarre.
Tu connais les spécificités françaises : ROAS attendu, coût par clic Meta FR, CPM TikTok FR,
importance de la preuve sociale, du SAV réactif, des influenceurs micro-français.
Tes recommandations sont actionnables immédiatement avec un budget de 500€ à 5000€.`

export async function runStrategieMarketing(
  produit: AnalyseProduit,
  marche: AnalyseMarche,
  avatar: AvatarClient
): Promise<StrategieMarketing> {
  const prompt = `Crée la stratégie marketing complète pour lancer ce produit en France :

Produit : ${produit.nom}
Bénéfice : ${produit.benefice_principal}
Cible : ${produit.cible_principale}
Prix recommandé : ${produit.fourchette_prix.recommande}€
Score demande : ${marche.score_demande}/100
Concurrence : ${marche.niveau_concurrence}
Plateformes FR : ${marche.plateformes_fr_pertinentes.join(', ')}
Avatar : ${avatar.prenom}, ${avatar.age.min}-${avatar.age.max} ans, ${avatar.genre}
Réseaux : ${avatar.reseaux_sociaux.join(', ')}
Objections : ${avatar.objections_typiques.join(' | ')}
Déclencheurs : ${avatar.declencheurs_achat.join(' | ')}

Retourne un objet JSON avec ce schéma exact :
{
  "positionnement": "comment se différencier sur le marché FR",
  "proposition_valeur_unique": "la promesse unique en 1 phrase percutante",
  "strategie_prix": "explication de la stratégie prix choisie",
  "tunnel_de_conversion": [
    {
      "etape": "Awareness",
      "objectif": "objectif de cette étape",
      "canal": "TikTok / Meta",
      "message_cle": "message principal"
    }
  ],
  "phases_lancement": [
    {
      "phase": "Phase 1 – Validation",
      "duree": "2 semaines",
      "budget": "500€",
      "objectif": "objectif mesurable",
      "actions": ["action 1", "action 2"]
    }
  ],
  "canaux": [
    {
      "canal": "TikTok Ads",
      "priorite": "principal",
      "budget_pourcent": 50,
      "tactiques": ["tactique 1", "tactique 2"]
    }
  ],
  "kpis": [
    { "metrique": "ROAS", "objectif": "3x minimum" }
  ],
  "roas_estime": "3.5x à 4.5x",
  "budget_lancement_recommande": "1 500€"
}`

  return appelAgent<StrategieMarketing>(SYSTEME, prompt, 3000)
}
