import { appelAgent } from './llm'
import type { AnalyseProduit, AvatarClient, CreationOffre, CampagnesPub } from './types'

const SYSTEME = `Tu es un media buyer expert en publicité Meta (Facebook/Instagram) et TikTok Ads pour le marché français.
Tu rédiges des accroches publicitaires qui stoppent le scroll, adaptées au comportement des utilisateurs français.
Tu connais les formats qui performent en France : UGC authentique, before/after, témoignages vidéo courts,
démonstrations produit en situation réelle française (cuisine française, appartement haussmannien, etc.).
Tes textes publicitaires sont directs, sans jargon, et parlent au quotidien des Français.`

export async function runCampagnesPub(
  produit: AnalyseProduit,
  avatar: AvatarClient,
  offre: CreationOffre
): Promise<CampagnesPub> {
  const prompt = `Crée les campagnes publicitaires complètes pour ce produit en France :

Produit : ${produit.nom}
Facteur WOW : ${produit.facteur_wow}
Bénéfice : ${produit.benefice_principal}
Problème : ${produit.probleme_resolu}
Avatar : ${avatar.prenom}, ${avatar.age.min}-${avatar.age.max} ans
Points douleur : ${avatar.points_douleur.slice(0,3).join(' | ')}
Moteurs émotionnels : ${avatar.moteurs_emotionnels.join(', ')}
Prix : ${offre.prix_psychologique}€ (barré ${offre.prix_barre}€)
CTA : ${offre.appel_a_action_principal}
Déclencheurs urgence : ${offre.urgence_rarete.join(' | ')}

Retourne un objet JSON avec ce schéma exact :
{
  "meta": {
    "principales": [
      {
        "format": "Vidéo 15s",
        "accroche": "Première phrase qui stoppe le scroll",
        "texte_principal": "Corps du texte publicitaire complet",
        "description": "Description sous le titre (30 mots max)",
        "appel_a_action": "Acheter maintenant",
        "audience": "Description de l'audience ciblée",
        "objectif": "Conversion / Trafic",
        "angle": "Problème-solution / Témoignage / Before-After"
      },
      {
        "format": "Carrousel",
        "accroche": "Deuxième accroche angle différent",
        "texte_principal": "Corps du texte pub carrousel",
        "description": "Description carrousel",
        "appel_a_action": "Découvrir",
        "audience": "Retargeting visiteurs",
        "objectif": "Conversion",
        "angle": "Bénéfices produit"
      },
      {
        "format": "Image statique",
        "accroche": "Troisième accroche",
        "texte_principal": "Corps du texte image statique",
        "description": "Description image",
        "appel_a_action": "En profiter",
        "audience": "Lookalike acheteurs",
        "objectif": "Conversion",
        "angle": "Urgence et rareté"
      }
    ]
  },
  "tiktok": {
    "pubs": [
      {
        "accroche": "Première phrase du script TikTok (hook 3 secondes)",
        "legende": "Légende avec emojis et hashtags pour le post",
        "hashtags": ["#produit", "#viral", "#france"],
        "musique": "Description du style de musique tendance",
        "duree": "15-30 secondes",
        "format": "UGC / Démonstration / POV",
        "angle_createur": "Mère de famille qui teste le produit"
      },
      {
        "accroche": "Deuxième hook TikTok",
        "legende": "Deuxième légende TikTok",
        "hashtags": ["#hashtag1", "#hashtag2"],
        "musique": "Style musique tendance 2",
        "duree": "30-60 secondes",
        "format": "Before/After",
        "angle_createur": "Entrepreneur qui présente sa découverte"
      }
    ]
  }
}`

  return appelAgent<CampagnesPub>(SYSTEME, prompt, 3000)
}
