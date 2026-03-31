/**
 * Profile Service — persiste le profil utilisateur côté serveur.
 * Quand un CV est uploadé, son profil est sauvegardé ici.
 * Le matching engine et le scheduler l'utilisent automatiquement.
 */
import fs from 'fs'
import path from 'path'
import type { ParsedCV } from '../types'

const PROFILE_PATH = path.join(process.cwd(), 'data', 'profile.json')

export interface UserProfile {
  cv: ParsedCV
  savedAt: string
  // Derived fields for fast matching
  skillsLower: string[]
  keyTerms: string[]  // skills + job titles + domain keywords
}

function ensureDataDir() {
  const dir = path.dirname(PROFILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function saveProfile(cv: ParsedCV): UserProfile {
  ensureDataDir()

  // Extract key terms for matching (skills + experience titles + education)
  const keyTerms = [
    ...cv.skills,
    ...cv.experience.map(e => e.title).filter(Boolean),
    ...cv.experience.map(e => e.company).filter(Boolean),
  ]
    .map(t => t.toLowerCase())
    .filter((t, i, arr) => t.length > 2 && arr.indexOf(t) === i)

  const profile: UserProfile = {
    cv,
    savedAt: new Date().toISOString(),
    skillsLower: cv.skills.map(s => s.toLowerCase()),
    keyTerms,
  }

  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf-8')
  console.log(`[Profile] Saved: ${cv.name} — ${cv.skills.length} skills, ${cv.experience.length} experiences`)
  return profile
}

export function loadProfile(): UserProfile | null {
  if (!fs.existsSync(PROFILE_PATH)) return null
  try {
    return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8')) as UserProfile
  } catch {
    return null
  }
}

export function hasProfile(): boolean {
  return fs.existsSync(PROFILE_PATH)
}
