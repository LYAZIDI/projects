import { appelAgent, safeArr } from './llm'
import type { AnalyseProduit, AvatarClient, PlanContenu } from './types'

const SYSTEME = `Tu es un créateur de contenu expert en TikTok, Instagram Reels et email marketing pour le marché français.
Tu crées des scripts viraux adaptés aux codes culturels français : humour subtil, réassurance, authenticité.
Tu connais les tendances TikTok FR : formats "POV", "Je teste", "Honnêtement", before/after, unboxing réactif.
Tes scripts sont naturels, pas "trop vendeurs" car les Français fuient la pub agressive.
Tu sais aussi créer des séquences email qui convertissent avec un ton amical et direct.`

export async function runPlanContenu(
  produit: AnalyseProduit,
  avatar: AvatarClient
): Promise<PlanContenu> {
  const prompt = `Crée le plan de contenu complet pour lancer ce produit sur les réseaux sociaux français :

Produit : ${produit.nom}
Bénéfice : ${produit.benefice_principal}
Facteur WOW : ${produit.facteur_wow}
Problème : ${produit.probleme_resolu}
Avatar : ${avatar.prenom}, ${avatar.age.min}-${avatar.age.max} ans
Réseaux : ${safeArr(avatar.reseaux_sociaux).join(', ')}
Points douleur : ${safeArr(avatar.points_douleur).join(' | ')}
Désirs : ${safeArr(avatar.desirs).join(' | ')}
Journée type : ${avatar.journee_type}

Retourne un objet JSON avec ce schéma exact :
{
  "scripts_tiktok": [
    {
      "angle": "Je teste ce produit viral",
      "accroche": "Phrase d'accroche des 3 premières secondes",
      "script": "Script complet du TikTok (200 mots max)",
      "duree": "30 secondes",
      "appel_a_action": "CTA en fin de vidéo",
      "type_createur": "Mère de famille / Étudiant / Entrepreneur"
    },
    {
      "angle": "Before / After",
      "accroche": "Hook before/after",
      "script": "Script before/after complet",
      "duree": "15 secondes",
      "appel_a_action": "Lien en bio",
      "type_createur": "Utilisateur lambda"
    },
    {
      "angle": "POV : tu découvres ce produit",
      "accroche": "Hook POV",
      "script": "Script POV complet",
      "duree": "20 secondes",
      "appel_a_action": "Commenter si tu veux le lien",
      "type_createur": "Créateur lifestyle"
    }
  ],
  "accroches": [
    "Accroche 1 — question provocante",
    "Accroche 2 — statistique choc",
    "Accroche 3 — témoignage",
    "Accroche 4 — problème identifiable",
    "Accroche 5 — curiosité"
  ],
  "angles": [
    "Angle 1 : Problème quotidien",
    "Angle 2 : Économie d'argent",
    "Angle 3 : Gain de temps",
    "Angle 4 : Témoignage client",
    "Angle 5 : Comparatif concurrents"
  ],
  "sequence_email": [
    {
      "objet": "Bienvenue — votre commande est confirmée",
      "previsualisation": "Texte de prévisualisation de l'email",
      "corps": "Corps de l'email de bienvenue complet",
      "appel_a_action": "Suivre ma commande",
      "delai": "Immédiat"
    },
    {
      "objet": "Astuce pour profiter à 100% de votre [produit]",
      "previsualisation": "Prévisualisation email conseil",
      "corps": "Email de conseil d'utilisation",
      "appel_a_action": "Voir les astuces",
      "delai": "J+3"
    },
    {
      "objet": "Vous êtes satisfait ? Dites-le nous",
      "previsualisation": "Votre avis compte pour nous",
      "corps": "Email de demande d'avis client",
      "appel_a_action": "Laisser un avis",
      "delai": "J+7"
    }
  ],
  "calendrier_contenu": [
    { "jour": 1, "plateforme": "TikTok", "type": "Vidéo produit", "sujet": "Découverte produit" },
    { "jour": 2, "plateforme": "Instagram", "type": "Reel", "sujet": "Before/After" },
    { "jour": 3, "plateforme": "TikTok", "type": "Témoignage", "sujet": "Avis client UGC" },
    { "jour": 5, "plateforme": "Instagram", "type": "Story", "sujet": "Coulisses / making-of" },
    { "jour": 7, "plateforme": "TikTok", "type": "FAQ Live", "sujet": "Réponses aux commentaires" }
  ]
}`

  return appelAgent<PlanContenu>(SYSTEME, prompt, 3500)
}
