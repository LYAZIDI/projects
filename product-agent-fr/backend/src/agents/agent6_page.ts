import { appelAgent } from './llm'
import type { AnalyseProduit, AvatarClient, CreationOffre, PageProduit } from './types'

const SYSTEME = `Tu es un copywriter e-commerce spécialisé pour le marché français.
Tu écris des pages produits qui convertissent sur Shopify : titres accrocheurs, bénéfices avant caractéristiques,
preuves sociales réalistes, FAQ qui lèvent les objections spécifiques aux acheteurs français.
Tu utilises le registre direct et authentique — pas de langage "américain traduit", mais du français naturel
que utilise un vrai client français. Tu maîtrises le SEO on-page pour Google.fr.`

export async function runPageProduit(
  produit: AnalyseProduit,
  avatar: AvatarClient,
  offre: CreationOffre
): Promise<PageProduit> {
  const prompt = `Rédige la page produit complète pour ce produit vendu en France :

Produit : ${produit.nom}
Bénéfice principal : ${produit.benefice_principal}
Problème résolu : ${produit.probleme_resolu}
Caractéristiques : ${produit.caracteristiques_uniques.join(', ')}
Avatar : ${avatar.prenom}, points de douleur : ${avatar.points_douleur.slice(0,2).join(' | ')}
Objections : ${avatar.objections_typiques.join(' | ')}
Prix : ${offre.prix_psychologique}€ (barré ${offre.prix_barre}€)
Garantie : ${offre.garantie.message}
CTA : ${offre.appel_a_action_principal}
Mots-clés : ${produit.mots_cles_concurrents.join(', ')}

Retourne un objet JSON avec ce schéma exact :
{
  "titre_principal": "Titre H1 accrocheur et bénéfice-centré",
  "sous_titre": "Sous-titre qui renforce la promesse",
  "description_hero": "2-3 phrases d'accroche émotionnelle pour la section hero",
  "points_cles": ["✅ Bénéfice 1 concret", "✅ Bénéfice 2", "✅ Bénéfice 3", "✅ Bénéfice 4"],
  "preuves_sociales": [
    "⭐⭐⭐⭐⭐ Super produit, livraison rapide ! — Marie L., Lyon",
    "⭐⭐⭐⭐⭐ Exactement ce que je cherchais — Thomas B., Paris"
  ],
  "faq": [
    { "question": "Question fréquente 1 ?", "reponse": "Réponse rassurante 1" },
    { "question": "Combien de temps pour la livraison ?", "reponse": "Livraison en 3-5 jours ouvrés" }
  ],
  "declencheurs_urgence": ["⏰ Plus que 12 en stock", "🎁 Bonus offert jusqu'à ce soir"],
  "appel_a_action": "Commander maintenant – Livraison offerte",
  "titre_seo": "Titre SEO optimisé Google.fr (60 chars max)",
  "meta_description": "Meta description engageante (155 chars max)",
  "mots_cles_seo": ["mot-clé 1", "mot-clé longue traîne 2"],
  "sections": [
    { "titre": "Pourquoi vous allez adorer", "contenu": "Contenu de la section..." },
    { "titre": "Comment ça fonctionne", "contenu": "Étapes simples d'utilisation..." }
  ],
  "script_email_abandon_panier": "Objet : Vous avez oublié quelque chose... Corps : [email complet de récupération panier]"
}`

  return appelAgent<PageProduit>(SYSTEME, prompt, 3000)
}
