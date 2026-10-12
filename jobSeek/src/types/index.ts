export interface Experience {
  title: string
  company: string
  period: string
  description?: string
}

export interface Education {
  degree: string
  school: string
  year: string
}

export interface ParsedCV {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: Experience[]
  education: Education[]
  languages: string[]
  atsScore: number
  atsKeywordsFound: string[]
  atsMissing: string[]
  yearsExperience: number
  sector?: 'transport' | 'tech' | 'generic'
  summary?: string
  rawText?: string
}

export interface TranslatedCV {
  name: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: { title: string; company: string; period: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
  detectedSourceLanguage: string
}

export type JobType = 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Alternance'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  salary?: string
  type: JobType
  remote: boolean
  tags: string[]
  source: string
  postedAt: string
  matchScore?: number
  questions?: string[]
  url?: string
}

export type ApplicationStatus = 'to_apply' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface Application {
  id: string
  job: Job
  status: ApplicationStatus
  appliedAt: string
  nextAction?: string
  coverLetter?: string
  notes?: string
}

export interface Notification {
  id: string
  type: 'new_job' | 'high_match' | 'follow_up' | 'interview' | 'ats_tip'
  title: string
  message: string
  jobId?: string
  read: boolean
  createdAt: string
}

export interface ATSSuggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  message: string
  example?: string
}

export interface ATSAnalysis {
  jobTitle: string
  score: number
  keywordsFound: string[]
  keywordsMissing: string[]
  suggestions: ATSSuggestion[]
  rewrittenSummary?: string
}
