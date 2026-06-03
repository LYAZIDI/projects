import { create } from 'zustand'
import { budgetDB } from '../db/client'
import type { Budget } from '../types'
import { moisCourant, calculerPourcentage } from '../utils/formatters'

interface BudgetState {
  budget: Budget | null
  chargement: boolean

  // Actions
  chargerBudget: (mois?: string) => Promise<void>
  definirBudget: (montant: number, alertePourcent?: number, mois?: string) => Promise<void>
  supprimerBudget: (mois?: string) => Promise<void>

  // Sélecteurs
  budgetRestant: (totalDepenses: number) => number | null
  pourcentageUtilise: (totalDepenses: number) => number
  estDepasse: (totalDepenses: number) => boolean
  doitAlerter: (totalDepenses: number) => boolean
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  chargement: false,

  chargerBudget: async (mois) => {
    const m = mois ?? moisCourant()
    set({ chargement: true })
    const budget = await budgetDB.get(m)
    set({ budget, chargement: false })
  },

  definirBudget: async (montant, alertePourcent = 80, mois) => {
    const m = mois ?? moisCourant()
    const budget: Budget = { mois: m, montant, alerte_pourcent: alertePourcent }
    await budgetDB.upsert(budget)
    set({ budget })
  },

  supprimerBudget: async (mois) => {
    const m = mois ?? moisCourant()
    await budgetDB.delete(m)
    set({ budget: null })
  },

  budgetRestant: (totalDepenses) => {
    const { budget } = get()
    if (!budget) return null
    return budget.montant - totalDepenses
  },

  pourcentageUtilise: (totalDepenses) => {
    const { budget } = get()
    if (!budget) return 0
    return calculerPourcentage(totalDepenses, budget.montant)
  },

  estDepasse: (totalDepenses) => {
    const { budget } = get()
    if (!budget) return false
    return totalDepenses > budget.montant
  },

  doitAlerter: (totalDepenses) => {
    const { budget } = get()
    if (!budget) return false
    const pct = calculerPourcentage(totalDepenses, budget.montant)
    return pct >= budget.alerte_pourcent
  },
}))
