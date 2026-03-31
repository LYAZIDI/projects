/**
 * Matcher — scoring pondéré CV ↔ Offre
 * Prend en compte : skills, seniority, mots-clés, remote, type de contrat
 */
import type { ParsedCV, Job } from '../types'

interface MatchWeights {
  skills: number        // correspondance compétences
  seniority: number     // années d'expérience
  keywords: number      // mots-clés dans la description
  location: number      // localisation / remote
}

const DEFAULT_WEIGHTS: MatchWeights = {
  skills: 50,
  seniority: 20,
  keywords: 20,
  location: 10,
}

export function computeMatchScore(cv: ParsedCV, job: Job, weights = DEFAULT_WEIGHTS): number {
  const total = weights.skills + weights.seniority + weights.keywords + weights.location

  // 1. Skills overlap
  const cvSkillsLower = cv.skills.map(s => s.toLowerCase())
  const jobTagsLower = job.tags.map(t => t.toLowerCase())
  const matchedSkills = jobTagsLower.filter(t => cvSkillsLower.some(s => s.includes(t) || t.includes(s)))
  const skillScore = job.tags.length > 0
    ? (matchedSkills.length / job.tags.length) * weights.skills
    : weights.skills * 0.5

  // 2. Seniority (parse years from job description)
  const seniorityScore = scoreSeniority(cv.yearsExperience, job.description) * weights.seniority

  // 3. Keyword density in job description
  const keywordScore = scoreKeywords(cv, job) * weights.keywords

  // 4. Location / remote bonus
  const locationScore = job.remote ? weights.location : weights.location * 0.6

  const raw = ((skillScore + seniorityScore + keywordScore + locationScore) / total) * 100
  return Math.min(Math.round(raw), 100)
}

function scoreSeniority(yearsExp: number, jobDesc: string): number {
  const desc = jobDesc.toLowerCase()
  // Detect required seniority from job text
  if (/junior|débutant|0.?2\s*ans|entry.?level/.test(desc)) {
    return yearsExp <= 3 ? 1 : 0.6
  }
  if (/confirmé|intermédiaire|2.?5\s*ans|mid.?level/.test(desc)) {
    return yearsExp >= 2 && yearsExp <= 7 ? 1 : 0.5
  }
  if (/senior|expérimenté|5\+?\s*ans|lead|7\+?\s*ans/.test(desc)) {
    return yearsExp >= 4 ? 1 : 0.3
  }
  // No seniority specified → neutral
  return 0.7
}

function scoreKeywords(cv: ParsedCV, job: Job): number {
  const haystack = (job.description + ' ' + job.title).toLowerCase()
  const allCvTerms = [
    ...cv.skills,
    ...cv.experience.map(e => e.title),
    ...cv.languages,
  ].map(t => t.toLowerCase())

  const hits = allCvTerms.filter(term => haystack.includes(term))
  return Math.min(hits.length / Math.max(allCvTerms.length * 0.3, 1), 1)
}

// Score a list of jobs against a CV (mutates matchScore)
export function scoreJobsForCV(cv: ParsedCV, jobs: Job[]): Job[] {
  return jobs
    .map(job => ({ ...job, matchScore: computeMatchScore(cv, job) }))
    .sort((a, b) => b.matchScore - a.matchScore)
}

// Simple version without a CV (from skills array only)
export function computeMatchFromSkills(userSkills: string[], jobTags: string[]): number {
  if (!jobTags.length) return 50
  if (!userSkills.length) return 50

  const lower = userSkills.map(s => s.toLowerCase())
  const matched = jobTags.filter(t =>
    lower.some(s => s.includes(t.toLowerCase()) || t.toLowerCase().includes(s))
  )

  if (matched.length === 0) {
    // No direct skill match → score 5-20% (poor match, not zero)
    return Math.floor(Math.random() * 15) + 5
  }

  const ratio = matched.length / jobTags.length
  // Scale: 1 match on 5 tags = 20% → 62%, full match = 95%
  const score = Math.round(30 + ratio * 65)
  return Math.min(score, 97)
}
