import { appelAgent } from './llm'
import type { ProduitInput, AnalyseProduit } from './types'

const SYSTEME = `Tu es un expert en e-commerce et dropshipping avec 10 ans d'expérience sur le marché français.
Tu analyses des produits pour identifier leur potentiel commercial sur des boutiques Shopify françaises.
Tu penses comme un entrepreneur qui veut générer du chiffre d'affaires rapidement.
Sois précis, orienté business, et direct.`

export async function runAnalyseProduit(input: ProduitInput): Promise<AnalyseProduit> {
  const prompt = `Analyse ce produit pour son potentiel dropshipping sur le marché français :

Nom : ${input.nom}
Description : ${input.description}
${input.url ? `URL : ${input.url}` : ''}
${input.prix ? `Prix : ${input.prix}€` : ''}
${input.categorie ? `Catégorie : ${input.categorie}` : ''}

Retourne un objet JSON avec ce schéma exact :
{
  "nom": "nom commercial du produit",
  "categorie": "catégorie produit",
  "benefice_principal": "le bénéfice n°1 en une phrase percutante",
  "probleme_resolu": "quel problème concret résout-il pour le client français",
  "caracteristiques_uniques": ["caractéristique 1", "caractéristique 2", "caractéristique 3"],
  "cible_principale": "qui est l'acheteur type en France",
  "fourchette_prix": { "min": 15, "max": 25, "recommande": 34.90 },
  "mots_cles_concurrents": ["mot-clé 1", "mot-clé 2"],
  "facteur_wow": "pourquoi ce produit fait stopper le scroll sur TikTok/Instagram",
  "potentiel_viral": "élevé",
  "est_produit_gagnant": true
}`

  return appelAgent<AnalyseProduit>(SYSTEME, prompt, 1500)
}
