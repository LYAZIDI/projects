import { appelAgent } from './llm'
import type { AnalyseProduit, AnalyseMarche, AvatarClient } from './types'

const SYSTEME = `Tu es un expert en psychologie du consommateur français et en marketing comportemental.
Tu construis des avatars clients ultra-précis pour le marché français.
Tu connais les spécificités culturelles françaises : rapport à la qualité vs prix,
méfiance envers le dropshipping pas cher, attachement aux marques locales, importance du service client,
habitude d'acheter sur Amazon.fr, Cdiscount, La Redoute, ou via Instagram Shopping.
Ton avatar doit ressembler à une vraie personne qu'on pourrait rencontrer en France.`

export async function runAvatarClient(
  produit: AnalyseProduit,
  marche: AnalyseMarche
): Promise<AvatarClient> {
  const prompt = `Construis l'avatar client idéal pour ce produit en France :

Produit : ${produit.nom}
Bénéfice : ${produit.benefice_principal}
Problème : ${produit.probleme_resolu}
Cible : ${produit.cible_principale}
Marchés : ${marche.marches_prioritaires.join(', ')}
Score demande : ${marche.score_demande}/100
Plateformes FR : ${marche.plateformes_fr_pertinentes.join(', ')}

Retourne un objet JSON avec ce schéma exact :
{
  "prenom": "prénom français typique de cet avatar",
  "age": { "min": 28, "max": 45 },
  "genre": "genre principal",
  "localisation": ["Île-de-France", "Auvergne-Rhône-Alpes"],
  "revenu": "X 000 – Y 000 €/an",
  "profession": ["métier 1", "métier 2"],
  "points_douleur": ["douleur 1 très spécifique", "douleur 2", "douleur 3", "douleur 4"],
  "desirs": ["désir 1", "désir 2", "désir 3"],
  "objections_typiques": ["Je ne commande pas sur des sites que je ne connais pas", "objection 2"],
  "declencheurs_achat": ["Ce qui le fait craquer et acheter 1", "déclencheur 2"],
  "reseaux_sociaux": ["TikTok", "Instagram"],
  "habitudes_achat_fr": ["commande surtout sur Amazon.fr", "habitude 2 spécifique à la France"],
  "valeurs": ["valeur 1", "valeur 2"],
  "journee_type": "description d'une journée type et où ce produit s'intègre",
  "moteurs_emotionnels": ["émotion 1", "émotion 2"],
  "sensibilite_prix": "élevée",
  "confiance_dropshipping": "faible"
}`

  return appelAgent<AvatarClient>(SYSTEME, prompt, 2000)
}
