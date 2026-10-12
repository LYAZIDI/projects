import { api, apiMultipart } from './client'
import type { ParsedCV, TranslatedCV } from '../types'

export interface UploadResponse {
  success: boolean
  filename: string
  parsed: ParsedCV
}

export interface ProfileResponse {
  cv: ParsedCV
  savedAt: string
  skillsLower: string[]
  keyTerms: string[]
}

export async function uploadCV(fileUri: string, fileName: string, mimeType: string): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('cv', { uri: fileUri, type: mimeType, name: fileName } as any)
  return apiMultipart<UploadResponse>('/api/cv/upload', formData)
}

export async function saveProfile(cv: ParsedCV): Promise<void> {
  await api('/api/cv/profile', {
    method: 'POST',
    body: JSON.stringify({ cv }),
  })
}

export async function fetchProfile(): Promise<ProfileResponse> {
  return api<ProfileResponse>('/api/cv/profile')
}

export async function translateCV(cv: ParsedCV): Promise<TranslatedCV> {
  const result = await api<{ success: boolean; translated: TranslatedCV }>('/api/cv/translate', {
    method: 'POST',
    body: JSON.stringify({
      rawText: cv.rawText ?? '',
      parsedData: {
        name: cv.name,
        email: cv.email,
        phone: cv.phone,
        skills: cv.skills,
        experience: cv.experience.map(e => ({ title: e.title, company: e.company, period: e.period })),
        education: cv.education,
        languages: cv.languages,
      },
    }),
  })
  return result.translated
}
