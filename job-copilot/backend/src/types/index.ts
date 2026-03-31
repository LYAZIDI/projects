// ─── CV ───────────────────────────────────────────────────────────────────────

export interface ExperienceItem {
  title: string
  company: string
  period: string
  description: string
}

export interface EducationItem {
  degree: string
  school: string
  year: string
}

export interface ParsedCV {
  rawText: string
  name: string
  email: string
  phone: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  languages: string[]
  atsScore: number
  atsKeywordsFound: string[]
  atsMissing: string[]
  yearsExperience: number
  sector?: string  // detected domain: transport, tech, compta, commerce, generic
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobSource = 'france_travail' | 'mock' | 'manual'
export type ContractType = 'CDI' | 'CDD' | 'Freelance' | 'Stage' | 'Alternance' | 'Interim'

export interface Job {
  id: string
  source: JobSource
  title: string
  company: string
  location: string
  description: string
  salary: string
  type: ContractType
  remote: boolean
  tags: string[]
  url: string
  logo: string
  postedAt: string
  fetchedAt: string
  matchScore: number  // 0-100, computed per user
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_job'       // nouveau job trouvé
  | 'high_match'    // job > 85%
  | 'follow_up'     // relance recommandée
  | 'interview'     // rappel entretien
  | 'ats_tip'       // conseil ATS

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

// ─── Applications ─────────────────────────────────────────────────────────────

export type AppStatus = 'to_apply' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface Application {
  id: string
  jobId: string
  jobTitle: string
  company: string
  matchScore: number
  status: AppStatus
  appliedAt: string
  updatedAt: string
  notes: string
  nextAction?: string
  timeline: TimelineEvent[]
}

export interface TimelineEvent {
  date: string
  event: string
  note?: string
}

// ─── ATS ──────────────────────────────────────────────────────────────────────

export interface ATSAnalysis {
  jobId?: string
  jobTitle: string
  score: number
  keywordsFound: string[]
  keywordsMissing: string[]
  suggestions: ATSSuggestion[]
  rewrittenSummary?: string
}

export interface ATSSuggestion {
  type: 'add_keyword' | 'rephrase' | 'quantify' | 'format'
  priority: 'high' | 'medium' | 'low'
  message: string
  example?: string
}
