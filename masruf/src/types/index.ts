// ─── Modèles de données ────────────────────────────────────────────────────────

export type CompteType = 'cash' | 'carte' | 'wallet'

export interface Depense {
  id: string
  montant: number
  categorie_id: string
  date: string         // ISO 8601 : YYYY-MM-DD
  note: string
  compte: CompteType
  cree_le: string      // timestamp ISO
}

export interface Categorie {
  id: string
  nom: string
  icone: string        // nom d'icône Ionicons
  couleur: string      // hex
  est_defaut: boolean
}

export interface Budget {
  mois: string         // YYYY-MM
  montant: number
  alerte_pourcent: number  // 0-100, défaut 80
}

export interface Compte {
  id: string
  nom: string
  type: CompteType
  icone: string
}

// ─── Types UI ─────────────────────────────────────────────────────────────────

export interface StatCategorie {
  categorie: Categorie
  total: number
  pourcentage: number
  nombre: number
}

export interface StatMensuelle {
  mois: string         // YYYY-MM
  total: number
}

export interface ResumeMois {
  total: number
  budget: number | null
  restant: number | null
  depenseCount: number
  stats: StatCategorie[]
}
