import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Application, ApplicationStatus, Job } from '../types'

const KEY = 'jobseek_applications'

interface ApplicationsStore {
  applications: Application[]
  charger: () => Promise<void>
  ajouter: (job: Job) => Promise<void>
  changerStatut: (id: string, status: ApplicationStatus) => Promise<void>
  supprimer: (id: string) => Promise<void>
  parStatut: (status: ApplicationStatus) => Application[]
  stats: () => { total: number; entretiens: number; offres: number; taux: number }
}

export const useApplicationsStore = create<ApplicationsStore>((set, get) => ({
  applications: [],

  charger: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY)
      if (raw) set({ applications: JSON.parse(raw) })
    } catch {}
  },

  ajouter: async (job) => {
    const already = get().applications.find((a) => a.job.id === job.id)
    if (already) return
    const nouvelle: Application = {
      id: `app-${Date.now()}`,
      job,
      status: 'to_apply',
      appliedAt: new Date().toISOString().slice(0, 10),
    }
    const updated = [...get().applications, nouvelle]
    set({ applications: updated })
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  },

  changerStatut: async (id, status) => {
    const updated = get().applications.map((a) =>
      a.id === id ? { ...a, status } : a
    )
    set({ applications: updated })
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  },

  supprimer: async (id) => {
    const updated = get().applications.filter((a) => a.id !== id)
    set({ applications: updated })
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  },

  parStatut: (status) => {
    return get().applications.filter((a) => a.status === status)
  },

  stats: () => {
    const apps = get().applications
    const total = apps.length
    const entretiens = apps.filter((a) => a.status === 'interview').length
    const offres = apps.filter((a) => a.status === 'offer').length
    const reponses = apps.filter((a) =>
      ['interview', 'offer', 'rejected'].includes(a.status)
    ).length
    const taux = total > 0 ? Math.round((reponses / total) * 100) : 0
    return { total, entretiens, offres, taux }
  },
}))
