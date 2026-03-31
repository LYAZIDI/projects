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
}

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
