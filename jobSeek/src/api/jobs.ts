import { api } from './client'
import type { Job } from '../types'

export interface MatchedJobsResponse {
  hasProfile: boolean
  profileName: string
  skillsUsed: string[]
  excellent: Job[]
  bon: Job[]
  faible: Job[]
  total: number
  scoredAt: string
}

export interface DiscoveryResponse {
  added: number
  total: number
  sources: string[]
}

export interface DiscoveryStatus {
  total: number
  bySource: { france_travail: number; adzuna: number; mock: number }
  apis: {
    franceTravail: { active: boolean; label: string }
    adzuna: { active: boolean; label: string }
  }
  configured: boolean
}

function mapJob(j: any): Job {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description ?? '',
    salary: j.salary ?? '',
    type: j.type ?? j.contract ?? 'CDI',
    remote: j.remote ?? false,
    tags: j.tags ?? [],
    source: j.source ?? 'api',
    postedAt: j.postedAt ?? j.posted_at ?? new Date().toISOString(),
    matchScore: j.matchScore ?? j.score ?? 0,
    url: j.url ?? '',
    questions: j.questions ?? [],
  }
}

export async function fetchJobs(params?: { skills?: string; remote?: boolean; minScore?: number }): Promise<Job[]> {
  const qs = new URLSearchParams()
  if (params?.skills) qs.set('skills', params.skills)
  if (params?.remote) qs.set('remote', 'true')
  if (params?.minScore) qs.set('minScore', String(params.minScore))
  const query = qs.toString() ? `?${qs}` : ''
  const data = await api<any[]>(`/api/jobs${query}`)
  return data.map(mapJob)
}

export async function fetchMatchedJobs(): Promise<MatchedJobsResponse> {
  const data = await api<any>('/api/jobs/matched')
  return {
    ...data,
    excellent: (data.excellent ?? []).map(mapJob),
    bon: (data.bon ?? []).map(mapJob),
    faible: (data.faible ?? []).map(mapJob),
  }
}

export async function fetchJob(id: string): Promise<Job> {
  const data = await api<any>(`/api/jobs/${id}`)
  return mapJob(data)
}

export async function runDiscovery(skills?: string[]): Promise<DiscoveryResponse> {
  return api<DiscoveryResponse>('/api/discovery/run', {
    method: 'POST',
    body: JSON.stringify({ skills }),
  })
}

export async function fetchDiscoveryStatus(): Promise<DiscoveryStatus> {
  return api<DiscoveryStatus>('/api/discovery/status')
}
