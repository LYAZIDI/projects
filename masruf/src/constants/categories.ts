import type { Categorie } from '../types'
import { PALETTE_CATEGORIES } from './theme'

// ─── Catégories par défaut (marché marocain) ──────────────────────────────────

export const CATEGORIES_DEFAUT: Categorie[] = [
  {
    id: 'alimentation',
    nom: 'Alimentation',
    icone: 'fast-food-outline',
    couleur: PALETTE_CATEGORIES[1],
    est_defaut: true,
  },
  {
    id: 'transport',
    nom: 'Transport',
    icone: 'car-outline',
    couleur: PALETTE_CATEGORIES[3],
    est_defaut: true,
  },
  {
    id: 'logement',
    nom: 'Logement',
    icone: 'home-outline',
    couleur: PALETTE_CATEGORIES[0],
    est_defaut: true,
  },
  {
    id: 'sante',
    nom: 'Santé',
    icone: 'medical-outline',
    couleur: PALETTE_CATEGORIES[4],
    est_defaut: true,
  },
  {
    id: 'vetements',
    nom: 'Vêtements',
    icone: 'shirt-outline',
    couleur: PALETTE_CATEGORIES[7],
    est_defaut: true,
  },
  {
    id: 'education',
    nom: 'Éducation',
    icone: 'school-outline',
    couleur: PALETTE_CATEGORIES[2],
    est_defaut: true,
  },
  {
    id: 'loisirs',
    nom: 'Loisirs',
    icone: 'game-controller-outline',
    couleur: PALETTE_CATEGORIES[5],
    est_defaut: true,
  },
  {
    id: 'factures',
    nom: 'Factures',
    icone: 'flash-outline',
    couleur: PALETTE_CATEGORIES[9],
    est_defaut: true,
  },
  {
    id: 'restaurant',
    nom: 'Restaurant',
    icone: 'restaurant-outline',
    couleur: PALETTE_CATEGORIES[6],
    est_defaut: true,
  },
  {
    id: 'courses',
    nom: 'Courses',
    icone: 'cart-outline',
    couleur: PALETTE_CATEGORIES[10],
    est_defaut: true,
  },
  {
    id: 'telephone',
    nom: 'Téléphone',
    icone: 'phone-portrait-outline',
    couleur: PALETTE_CATEGORIES[11],
    est_defaut: true,
  },
  {
    id: 'autre',
    nom: 'Autre',
    icone: 'ellipsis-horizontal-outline',
    couleur: PALETTE_CATEGORIES[8],
    est_defaut: true,
  },
]

export const COMPTES_DEFAUT = [
  { id: 'cash', nom: 'Espèces', type: 'cash' as const, icone: 'cash-outline' },
  { id: 'carte', nom: 'Carte bancaire', type: 'carte' as const, icone: 'card-outline' },
  { id: 'wallet', nom: 'Wallet (Inwi/Orange)', type: 'wallet' as const, icone: 'wallet-outline' },
]
