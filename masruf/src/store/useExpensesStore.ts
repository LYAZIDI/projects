import { create } from 'zustand'
import { depenseDB, categorieDB } from '../db/client'
import type { Depense, Categorie, StatCategorie } from '../types'
import { moisCourant, calculerPourcentage } from '../utils/formatters'

// ─── State ────────────────────────────────────────────────────────────────────

interface ExpensesState {
  depenses: Depense[]
  categories: Categorie[]
  moisSelectionne: string
  chargement: boolean
  erreur: string | null

  // Actions
  chargerCategories: () => Promise<void>
  chargerDepensesMois: (mois?: string) => Promise<void>
  ajouterDepense: (d: Omit<Depense, 'id' | 'cree_le'>) => Promise<Depense>
  modifierDepense: (d: Depense) => Promise<void>
  supprimerDepense: (id: string) => Promise<void>
  setMois: (mois: string) => void

  // Sélecteurs calculés
  totalMois: () => number
  statsByCategorie: () => StatCategorie[]
  depensesRecentes: (n?: number) => Depense[]
  getCategorieById: (id: string) => Categorie | undefined
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  depenses: [],
  categories: [],
  moisSelectionne: moisCourant(),
  chargement: false,
  erreur: null,

  // ─── Chargement catégories ────────────────────────────────────────────────

  chargerCategories: async () => {
    const categories = await categorieDB.getAll()
    set({ categories })
  },

  // ─── Chargement dépenses ──────────────────────────────────────────────────

  chargerDepensesMois: async (mois?: string) => {
    const m = mois ?? get().moisSelectionne
    set({ chargement: true, erreur: null })
    try {
      const depenses = await depenseDB.getByMois(m)
      set({ depenses, moisSelectionne: m, chargement: false })
    } catch (e) {
      set({ erreur: String(e), chargement: false })
    }
  },

  // ─── Ajouter une dépense ──────────────────────────────────────────────────

  ajouterDepense: async (data) => {
    const depense = await depenseDB.insert(data)
    // Recharger si la dépense est dans le mois sélectionné
    const moisDepense = data.date.slice(0, 7)
    if (moisDepense === get().moisSelectionne) {
      set(s => ({ depenses: [depense, ...s.depenses] }))
    }
    return depense
  },

  // ─── Modifier une dépense ─────────────────────────────────────────────────

  modifierDepense: async (depense) => {
    await depenseDB.update(depense)
    set(s => ({
      depenses: s.depenses.map(d => d.id === depense.id ? depense : d),
    }))
  },

  // ─── Supprimer une dépense ────────────────────────────────────────────────

  supprimerDepense: async (id) => {
    await depenseDB.delete(id)
    set(s => ({ depenses: s.depenses.filter(d => d.id !== id) }))
  },

  // ─── Changer de mois ─────────────────────────────────────────────────────

  setMois: (mois) => {
    set({ moisSelectionne: mois })
    get().chargerDepensesMois(mois)
  },

  // ─── Sélecteurs ──────────────────────────────────────────────────────────

  totalMois: () => {
    return get().depenses.reduce((s, d) => s + d.montant, 0)
  },

  statsByCategorie: () => {
    const { depenses, categories } = get()
    const total = depenses.reduce((s, d) => s + d.montant, 0)

    // Agréger par catégorie
    const map = new Map<string, { total: number; nombre: number }>()
    for (const d of depenses) {
      const ex = map.get(d.categorie_id) ?? { total: 0, nombre: 0 }
      map.set(d.categorie_id, { total: ex.total + d.montant, nombre: ex.nombre + 1 })
    }

    const stats: StatCategorie[] = []
    for (const [catId, { total: catTotal, nombre }] of map) {
      const categorie = categories.find(c => c.id === catId)
      if (!categorie) continue
      stats.push({
        categorie,
        total: catTotal,
        nombre,
        pourcentage: calculerPourcentage(catTotal, total),
      })
    }

    return stats.sort((a, b) => b.total - a.total)
  },

  depensesRecentes: (n = 5) => {
    return get().depenses.slice(0, n)
  },

  getCategorieById: (id) => {
    return get().categories.find(c => c.id === id)
  },
}))
