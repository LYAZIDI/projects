// Types frontend — mirror des types backend
export interface ResultatPipeline {
  id: string
  input: ProduitInput
  cree_le: string
  produit: AnalyseProduit
  marche: AnalyseMarche
  avatar: AvatarClient
  strategie: StrategieMarketing
  offre: CreationOffre
  page: PageProduit
  pubs: CampagnesPub
  contenu: PlanContenu
  score: ScoreMaster
}

export interface ProduitInput {
  nom: string
  description: string
  url?: string
  prix?: number
  categorie?: string
}

export interface AnalyseProduit {
  nom: string
  categorie: string
  benefice_principal: string
  probleme_resolu: string
  caracteristiques_uniques: string[]
  cible_principale: string
  fourchette_prix: { min: number; max: number; recommande: number }
  mots_cles_concurrents: string[]
  facteur_wow: string
  potentiel_viral: string
  est_produit_gagnant: boolean
}

export interface AnalyseMarche {
  score_demande: number
  niveau_concurrence: string
  risque_saturation: string
  tendance: string
  recherches_mensuelles_estimees: number
  marches_prioritaires: string[]
  saisonnalite: string
  fenetre_opportunite: string
  taille_marche_estime: string
  barrieres_entree: string[]
  insights_cles: string[]
  plateformes_fr_pertinentes: string[]
}

export interface AvatarClient {
  prenom: string
  age: { min: number; max: number }
  genre: string
  localisation: string[]
  revenu: string
  profession: string[]
  points_douleur: string[]
  desirs: string[]
  objections_typiques: string[]
  declencheurs_achat: string[]
  reseaux_sociaux: string[]
  habitudes_achat_fr: string[]
  valeurs: string[]
  journee_type: string
  moteurs_emotionnels: string[]
  sensibilite_prix: string
  confiance_dropshipping: string
}

export interface StrategieMarketing {
  positionnement: string
  proposition_valeur_unique: string
  strategie_prix: string
  tunnel_de_conversion: Array<{
    etape: string
    objectif: string
    canal: string
    message_cle: string
  }>
  phases_lancement: Array<{
    phase: string
    duree: string
    budget: string
    objectif: string
    actions: string[]
  }>
  canaux: Array<{
    canal: string
    priorite: string
    budget_pourcent: number
    tactiques: string[]
  }>
  kpis: Array<{ metrique: string; objectif: string }>
  roas_estime: string
  budget_lancement_recommande: string
}

export interface CreationOffre {
  nom_offre: string
  prix_psychologique: number
  prix_barre: number
  paiement_plusieurs_fois: {
    disponible: boolean
    options: string[]
    mensualite: string
  }
  garantie: {
    duree: string
    type: string
    message: string
  }
  bonus_inclus: string[]
  urgence_rarete: string[]
  livraison: {
    delai: string
    gratuite_a_partir: string
    message_confiance: string
  }
  badge_confiance: string[]
  bundle_suggestions: Array<{
    nom: string
    prix: number
    economies: string
  }>
  appel_a_action_principal: string
}

export interface PageProduit {
  titre_principal: string
  sous_titre: string
  description_hero: string
  points_cles: string[]
  preuves_sociales: string[]
  faq: Array<{ question: string; reponse: string }>
  declencheurs_urgence: string[]
  appel_a_action: string
  titre_seo: string
  meta_description: string
  mots_cles_seo: string[]
  sections: Array<{ titre: string; contenu: string }>
  script_email_abandon_panier: string
}

export interface CampagnesPub {
  meta: {
    principales: Array<{
      format: string
      accroche: string
      texte_principal: string
      description: string
      appel_a_action: string
      audience: string
      objectif: string
      angle: string
    }>
  }
  tiktok: {
    pubs: Array<{
      accroche: string
      legende: string
      hashtags: string[]
      musique: string
      duree: string
      format: string
      angle_createur: string
    }>
  }
}

export interface PlanContenu {
  scripts_tiktok: Array<{
    angle: string
    accroche: string
    script: string
    duree: string
    appel_a_action: string
    type_createur: string
  }>
  accroches: string[]
  angles: string[]
  sequence_email: Array<{
    objet: string
    previsualisation: string
    corps: string
    appel_a_action: string
    delai: string
  }>
  calendrier_contenu: Array<{
    jour: number
    plateforme: string
    type: string
    sujet: string
  }>
}

export interface ScoreMaster {
  score_global: number
  verdict: 'gagnant' | 'test' | 'risqué' | 'éviter'
  indicateur: string
  decision: string
  detail_scores: {
    demande_marche: number
    concurrence: number
    marge_potentielle: number
    potentiel_viral: number
    facilite_lancement: number
    adaptabilite_france: number
  }
  forces: string[]
  faiblesses: string[]
  plan_action_immediat: Array<{
    priorite: number
    action: string
    impact: string
    delai: string
    budget_estime: string
  }>
  chiffre_affaires_estime: {
    mois_1: string
    mois_3: string
    mois_6: string
  }
  seuil_rentabilite_unites: number
  conseil_final: string
}
