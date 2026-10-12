import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ParsedCV } from '../types'
import { saveProfile, fetchProfile, uploadCV } from '../api/cv'
import { checkConnexion } from '../api/client'

const KEY = 'jobseek_cv'

interface CVStore {
  cv: ParsedCV | null
  loaded: boolean
  synced: boolean
  charger: () => Promise<void>
  sauvegarder: (cv: ParsedCV) => Promise<void>
  uploadFichier: (uri: string, name: string, mime: string) => Promise<ParsedCV>
  syncBackend: () => Promise<void>
  reinitialiser: () => Promise<void>
}

export const useCVStore = create<CVStore>((set, get) => ({
  cv: null,
  loaded: false,
  synced: false,

  charger: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY)
      if (raw) {
        set({ cv: JSON.parse(raw), loaded: true })
      } else {
        set({ cv: null, loaded: true })
      }
    } catch {
      set({ cv: null, loaded: true })
    }
    get().syncBackend()
  },

  syncBackend: async () => {
    try {
      const connected = await checkConnexion()
      if (!connected) return
      const { cv: backendCV } = await fetchProfile()
      if (backendCV) {
        await AsyncStorage.setItem(KEY, JSON.stringify(backendCV))
        set({ cv: backendCV, synced: true })
      }
    } catch {}
  },

  sauvegarder: async (cv) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(cv))
    set({ cv })
    try {
      const connected = await checkConnexion()
      if (connected) {
        await saveProfile(cv)
        set({ synced: true })
      }
    } catch {}
  },

  uploadFichier: async (uri, name, mime) => {
    const result = await uploadCV(uri, name, mime)
    const cv = result.parsed
    await AsyncStorage.setItem(KEY, JSON.stringify(cv))
    set({ cv, synced: true })
    try {
      await saveProfile(cv)
    } catch {}
    return cv
  },

  reinitialiser: async () => {
    await AsyncStorage.removeItem(KEY)
    set({ cv: null, synced: false })
  },
}))
