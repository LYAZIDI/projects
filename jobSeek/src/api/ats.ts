import { api } from './client'
import type { ParsedCV, ATSAnalysis } from '../types'

export async function analyzeATS(cv: ParsedCV, jobTitle: string, jobDescription: string): Promise<ATSAnalysis> {
  return api<ATSAnalysis>('/api/ats/analyze', {
    method: 'POST',
    body: JSON.stringify({ cv, jobTitle, jobDescription }),
  })
}

export async function extractKeywords(jobDescription: string): Promise<string[]> {
  const data = await api<{ keywords: string[] }>('/api/ats/keywords', {
    method: 'POST',
    body: JSON.stringify({ jobDescription }),
  })
  return data.keywords
}
