/**
 * Matching Engine IA
 * Pipeline : profil utilisateur → jobs stockés → scoring → classement → catégories
 *
 * Score décomposé en 4 dimensions :
 *   1. Skills overlap (50 pts)  — compétences CV vs tags de l'offre
 *   2. Title/domain fit (25 pts) — titres d'expérience vs titre du poste
 *   3. Seniority fit (15 pts)   — années d'exp vs niveau requis dans l'offre
 *   4. Language bonus (10 pts)  — langues CV vs langue de l'offre
 */
import type { Job } from '../types'
import type { UserProfile } from './profileService'

export type MatchCategory = 'excellent' | 'bon' | 'faible'

export interface ScoredJob extends Job {
  matchScore: number
  matchCategory: MatchCategory
  matchedSkills: string[]
  missingSkills: string[]
  scoreBreakdown: {
    skills: number
    titleFit: number
    seniority: number
    bonus: number
  }
  matchReason: string  // human-readable explanation
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function scoreJob(job: Job, profile: UserProfile): ScoredJob {
  const jobTagsLower = job.tags.map(t => t.toLowerCase())
  const jobTitleLower = job.title.toLowerCase()
  const jobDescLower = job.description.toLowerCase()

  // 1. Skills overlap (0–50)
  const matchedTags = job.tags.filter(tag =>
    profile.skillsLower.some(s =>
      s.includes(tag.toLowerCase()) || tag.toLowerCase().includes(s)
    )
  )
  const missingTags = job.tags.filter(tag =>
    !profile.skillsLower.some(s =>
      s.includes(tag.toLowerCase()) || tag.toLowerCase().includes(s)
    )
  )
  const skillsScore = job.tags.length > 0
    ? Math.round((matchedTags.length / job.tags.length) * 50)
    : 20

  // 2. Title/domain fit (0–25)
  // Check if any CV key term appears in job title or description
  const titleHits = profile.keyTerms.filter(term =>
    jobTitleLower.includes(term) || jobDescLower.includes(term)
  )
  const titleScore = Math.min(Math.round((titleHits.length / Math.max(profile.keyTerms.length * 0.3, 1)) * 25), 25)

  // 3. Seniority fit (0–15)
  const seniorityScore = scoreSeniority(profile.cv.yearsExperience, jobDescLower)

  // 4. Language/context bonus (0–10)
  const languageScore = scoreLanguages(profile.cv.languages, jobDescLower)

  const total = skillsScore + titleScore + seniorityScore + languageScore

  // Clamp and map to category
  const finalScore = Math.min(Math.max(total, 3), 98)
  const category: MatchCategory =
    finalScore >= 65 ? 'excellent' : finalScore >= 35 ? 'bon' : 'faible'

  // Human-readable match reason
  const reason = buildMatchReason(matchedTags, missingTags, titleHits, finalScore, job)

  return {
    ...job,
    matchScore: finalScore,
    matchCategory: category,
    matchedSkills: matchedTags,
    missingSkills: missingTags,
    scoreBreakdown: {
      skills: skillsScore,
      titleFit: titleScore,
      seniority: seniorityScore,
      bonus: languageScore,
    },
    matchReason: reason,
  }
}

function scoreSeniority(yearsExp: number, jobDesc: string): number {
  if (/junior|d[eé]butant|0.?2\s*ans|entry.?level/i.test(jobDesc)) {
    return yearsExp <= 3 ? 15 : 8
  }
  if (/confirm[eé]|interm[eé]diaire|2.?5\s*ans|mid.?level/i.test(jobDesc)) {
    return yearsExp >= 2 && yearsExp <= 8 ? 15 : 7
  }
  if (/senior|exp[eé]riment[eé]|5\+?\s*ans|lead|7\+?\s*ans/i.test(jobDesc)) {
    return yearsExp >= 4 ? 15 : 5
  }
  return 10  // no seniority specified → neutral
}

function scoreLanguages(cvLanguages: string[], jobDesc: string): number {
  if (!cvLanguages.length) return 5
  const hasEnglish = cvLanguages.some(l => /anglais|english/i.test(l))
  const jobNeedsEnglish = /anglais|english|bilingual|bilingue/i.test(jobDesc)
  if (jobNeedsEnglish && hasEnglish) return 10
  if (jobNeedsEnglish && !hasEnglish) return 3
  return 7
}

function buildMatchReason(
  matched: string[],
  missing: string[],
  titleHits: string[],
  score: number,
  job: Job,
): string {
  if (score >= 65) {
    if (matched.length > 0) {
      return `Excellent profil — ${matched.slice(0, 2).join(' et ')} correspondent directement aux exigences du poste.`
    }
    return `Votre parcours est très aligné avec les attentes de ${job.company}.`
  }
  if (score >= 35) {
    if (matched.length > 0) {
      return `Bon potentiel — ${matched.slice(0, 2).join(' et ')} matchent. ${missing.length > 0 ? `Il manque : ${missing.slice(0, 2).join(', ')}.` : ''}`
    }
    return `Votre domaine d'expérience est proche de ce poste, mais quelques compétences manquent.`
  }
  return `Poste éloigné de votre profil — ${missing.slice(0, 3).join(', ')} sont requis mais absents de votre CV.`
}

// ─── Run the full matching pipeline ──────────────────────────────────────────

export interface MatchingResult {
  excellent: ScoredJob[]
  bon: ScoredJob[]
  faible: ScoredJob[]
  total: number
  profileName: string
  skillsUsed: string[]
  scoredAt: string
}

export function runMatchingPipeline(jobs: Job[], profile: UserProfile): MatchingResult {
  const scored = jobs
    .map(job => scoreJob(job, profile))
    .sort((a, b) => b.matchScore - a.matchScore)

  const excellent = scored.filter(j => j.matchCategory === 'excellent')
  const bon = scored.filter(j => j.matchCategory === 'bon')
  const faible = scored.filter(j => j.matchCategory === 'faible')

  console.log(
    `[MatchingEngine] ${profile.cv.name}: ${excellent.length} excellent, ${bon.length} bon, ${faible.length} faible`
  )

  return {
    excellent,
    bon,
    faible,
    total: scored.length,
    profileName: profile.cv.name,
    skillsUsed: profile.cv.skills,
    scoredAt: new Date().toISOString(),
  }
}
