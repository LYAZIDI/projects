import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Job } from '../types'
import { fetchMatchedJobs, fetchJobs, runDiscovery } from '../api/jobs'
import { checkConnexion } from '../api/client'

const FAV_KEY = 'jobseek_favorites'

type Filter = 'all' | 'excellent' | 'bon' | 'remote' | 'cdi'

interface JobsStore {
  jobs: Job[]
  favoris: string[]
  filtre: Filter
  recherche: string
  chargement: boolean
  erreur: string | null
  backendActif: boolean
  setFiltre: (f: Filter) => void
  setRecherche: (q: string) => void
  toggleFavori: (id: string) => void
  chargerFavoris: () => Promise<void>
  jobsFiltres: () => Job[]
  rafraichir: () => Promise<void>
  lancerDecouverte: () => Promise<string>
}

export const useJobsStore = create<JobsStore>((set, get) => ({
  jobs: [],
  favoris: [],
  filtre: 'all',
  recherche: '',
  chargement: false,
  erreur: null,
  backendActif: false,

  setFiltre: (filtre) => set({ filtre }),
  setRecherche: (recherche) => set({ recherche }),

  toggleFavori: async (id) => {
    const { favoris } = get()
    const nouveau = favoris.includes(id)
      ? favoris.filter((f) => f !== id)
      : [...favoris, id]
    set({ favoris: nouveau })
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(nouveau))
  },

  chargerFavoris: async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY)
      if (raw) set({ favoris: JSON.parse(raw) })
    } catch {}
  },

  jobsFiltres: () => {
    const { jobs, filtre, recherche } = get()
    let result = [...jobs]

    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    if (filtre === 'excellent') result = result.filter((j) => (j.matchScore ?? 0) >= 65)
    else if (filtre === 'bon') result = result.filter((j) => (j.matchScore ?? 0) >= 35 && (j.matchScore ?? 0) < 65)
    else if (filtre === 'remote') result = result.filter((j) => j.remote)
    else if (filtre === 'cdi') result = result.filter((j) => j.type === 'CDI')

    return result.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
  },

  rafraichir: async () => {
    set({ chargement: true, erreur: null })
    try {
      const connected = await checkConnexion()
      if (!connected) {
        set({ chargement: false, backendActif: false })
        return
      }
      set({ backendActif: true })
      try {
        const data = await fetchMatchedJobs()
        const all = [...data.excellent, ...data.bon, ...data.faible]
        if (all.length > 0) {
          set({ jobs: all, chargement: false })
          return
        }
      } catch {}
      const all = await fetchJobs()
      set({ jobs: all, chargement: false })
    } catch (e: any) {
      set({ chargement: false, erreur: e.message })
    }
  },

  lancerDecouverte: async () => {
    set({ chargement: true })
    try {
      const data = await runDiscovery()
      await get().rafraichir()
      return `${data.added} nouvelles offres ajoutées (${data.sources.join(', ')})`
    } catch (e: any) {
      set({ chargement: false })
      throw e
    }
  },
}))
