/**
 * ATS Optimizer
 * Analyse le CV par rapport à une offre spécifique et génère des suggestions concrètes.
 * Compatible avec les ATS courants : Workday, Greenhouse, Lever, Taleo.
 */
import type { ParsedCV, ATSAnalysis, ATSSuggestion } from '../types'

// ─── Keyword extraction from job description ──────────────────────────────────

const STOP_WORDS = new Set([
  'le','la','les','de','du','des','en','et','ou','un','une','pour','sur','avec',
  'dans','par','que','qui','ce','se','sa','son','ses','leur','nous','vous','ils',
  'the','a','an','and','or','of','to','in','for','with','on','at','is','are',
])

export function extractJobKeywords(jobDescription: string): string[] {
  const words = jobDescription
    .toLowerCase()
    .replace(/[^\w\sàáâãäåèéêëìíîïòóôõöùúûüýçœæ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))

  // Count frequency
  const freq = new Map<string, number>()
  words.forEach(w => freq.set(w, (freq.get(w) ?? 0) + 1))

  // Return top keywords sorted by frequency
  return [...freq.entries()]
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 25)
    .map(([word]) => word)
}

// ─── ATS Score calculation ────────────────────────────────────────────────────

export function analyzeATSForJob(cv: ParsedCV, jobTitle: string, jobDescription: string): ATSAnalysis {
  const jobKeywords = extractJobKeywords(jobDescription)
  const cvText = buildCVText(cv).toLowerCase()

  const keywordsFound: string[] = []
  const keywordsMissing: string[] = []

  for (const kw of jobKeywords) {
    if (cvText.includes(kw)) {
      keywordsFound.push(kw)
    } else {
      keywordsMissing.push(kw)
    }
  }

  // Base score
  const keywordRatio = jobKeywords.length > 0 ? keywordsFound.length / jobKeywords.length : 0
  const skillBonus = Math.min(cv.skills.length * 3, 30)
  const experienceBonus = cv.yearsExperience > 0 ? Math.min(cv.yearsExperience * 2, 20) : 0
  const lengthBonus = cvText.length > 800 ? 10 : 5

  const score = Math.min(
    Math.round(keywordRatio * 40 + skillBonus + experienceBonus + lengthBonus),
    100
  )

  // Generate suggestions
  const suggestions = generateSuggestions(cv, keywordsMissing, jobDescription)

  return {
    jobTitle,
    score,
    keywordsFound: keywordsFound.slice(0, 10),
    keywordsMissing: keywordsMissing.slice(0, 8),
    suggestions,
    rewrittenSummary: generateOptimizedSummary(cv, keywordsFound.slice(0, 5), jobTitle),
  }
}

// ─── Suggestion generator ─────────────────────────────────────────────────────

function generateSuggestions(cv: ParsedCV, missingKeywords: string[], jobDesc: string): ATSSuggestion[] {
  const suggestions: ATSSuggestion[] = []

  // Missing keywords
  if (missingKeywords.length > 0) {
    suggestions.push({
      type: 'add_keyword',
      priority: 'high',
      message: `Ajoutez ces mots-clés manquants dans votre CV : ${missingKeywords.slice(0, 4).join(', ')}`,
      example: `Dans votre section compétences ou dans la description d'une expérience, mentionnez explicitement "${missingKeywords[0]}".`,
    })
  }

  // Quantify achievements
  const hasNumbers = /\d+/.test(cv.experience.map(e => e.description).join(' '))
  if (!hasNumbers) {
    suggestions.push({
      type: 'quantify',
      priority: 'high',
      message: 'Quantifiez vos réalisations avec des chiffres précis',
      example: 'Ex: "Géré 150+ livraisons/jour avec 98% de ponctualité" plutôt que "Nombreuses livraisons".',
    })
  }

  // Format check
  if (cv.skills.length < 5) {
    suggestions.push({
      type: 'format',
      priority: 'medium',
      message: 'Enrichissez votre section compétences — les ATS comptent les mots-clés',
      example: 'Listez toutes vos compétences techniques ET transversales séparément.',
    })
  }

  // Rephrase experience
  if (cv.experience.length > 0 && cv.experience[0].description.length < 50) {
    suggestions.push({
      type: 'rephrase',
      priority: 'medium',
      message: 'Développez la description de vos expériences',
      example: 'Utilisez des verbes d\'action : "Géré", "Optimisé", "Assuré", "Coordonné".',
    })
  }

  // Remote mention
  if (/t[eé]l[eé]travail|remote/.test(jobDesc) && !/t[eé]l[eé]travail|remote/i.test(cv.skills.join(' '))) {
    suggestions.push({
      type: 'add_keyword',
      priority: 'low',
      message: 'L\'offre mentionne du télétravail — précisez votre expérience remote si applicable',
    })
  }

  return suggestions.slice(0, 5)
}

// ─── Optimized summary generator ─────────────────────────────────────────────

function generateOptimizedSummary(cv: ParsedCV, topKeywords: string[], jobTitle: string): string {
  const exp = cv.yearsExperience > 0 ? `${cv.yearsExperience} ans d'expérience` : 'Professionnel expérimenté'
  const skills = cv.skills.slice(0, 3).join(', ')
  const kws = topKeywords.slice(0, 2).join(' et ')

  return `${exp} en ${cv.experience[0]?.title || jobTitle}, spécialisé en ${skills}. `
    + `Expertise reconnue en ${kws || skills}. `
    + `${cv.languages.length > 1 ? `Maîtrise du ${cv.languages.join(' et ')}. ` : ''}`
    + `Cherche à contribuer efficacement à un poste de ${jobTitle}.`
}

// ─── CV text builder (for analysis) ──────────────────────────────────────────

function buildCVText(cv: ParsedCV): string {
  return [
    cv.name,
    cv.skills.join(' '),
    cv.experience.map(e => `${e.title} ${e.company} ${e.description}`).join(' '),
    cv.education.map(e => `${e.degree} ${e.school}`).join(' '),
    cv.languages.join(' '),
  ].join(' ')
}
