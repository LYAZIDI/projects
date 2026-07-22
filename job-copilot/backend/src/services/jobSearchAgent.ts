/**
 * Job Search Agent — Gemini 2.0 Flash avec Google Search grounding
 *
 * Étape 1 : Gemini cherche sur le web des offres réelles correspondant au profil
 * Étape 2 : Gemini structure les résultats en JSON propre
 */
import { getGeminiClient } from './llm'
import type { Job } from '../types'

export interface SearchCriteria {
  // Du CV
  skills: string[]
  experience: { title: string; company: string; period: string }[]
  languages: string[]
  yearsExperience?: number
  // Des préférences utilisateur
  jobTitle: string
  location: string
  salary?: string
  contractType?: string
  remote?: boolean
}

export async function searchJobsWithGemini(criteria: SearchCriteria): Promise<Job[]> {
  const client = getGeminiClient()

  const expSummary = criteria.experience
    .slice(0, 3)
    .map(e => `${e.title} chez ${e.company} (${e.period})`)
    .join(', ')

  const contractLabel = criteria.remote
    ? `${criteria.contractType || 'CDI'} en télétravail`
    : criteria.contractType || 'CDI'

  // ── Étape 1 : recherche web avec grounding ──────────────────────────────────
  const searchPrompt = `
Recherche des offres d'emploi actuellement ouvertes qui correspondent exactement à ce profil :

Poste visé : ${criteria.jobTitle}
Localisation : ${criteria.location}
Type de contrat : ${contractLabel}
${criteria.salary ? `Salaire cible : ${criteria.salary}` : ''}
Compétences clés : ${criteria.skills.slice(0, 10).join(', ')}
Expériences : ${expSummary || 'non précisé'}
${criteria.yearsExperience ? `Années d'expérience : ${criteria.yearsExperience}` : ''}
${criteria.languages?.length ? `Langues : ${criteria.languages.join(', ')}` : ''}

Cherche des offres réelles sur LinkedIn, Indeed, Welcome to the Jungle, APEC, Cadremploi, ou les sites carrières des entreprises.
Pour chaque offre trouvée, fournis : titre exact du poste, nom de l'entreprise, ville, lien URL de l'offre, salaire si mentionné, description courte, et les compétences requises.
Trouve au moins 10 offres pertinentes et actuelles.
`.trim()

  const step1 = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: searchPrompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: 'Tu es un expert en recherche d\'emploi. Cherche des offres réelles et actuelles sur le web.',
    },
  })

  const rawResults = (step1.text ?? '').trim()
  if (!rawResults) throw new Error('Aucun résultat retourné par la recherche Gemini')

  // ── Étape 2 : structuration JSON ────────────────────────────────────────────
  const structurePrompt = `
Voici des offres d'emploi trouvées sur le web :

${rawResults}

Transforme ces offres en un tableau JSON. Pour chaque offre, extrais :
- title : titre exact du poste
- company : nom de l'entreprise
- location : ville et pays
- salary : salaire ou fourchette (chaîne de caractères, "Selon profil" si absent)
- type : "CDI" | "CDD" | "Freelance" | "Stage" | "Alternance" | "Interim"
- remote : true si télétravail mentionné, sinon false
- description : résumé en 2 phrases maximum
- url : lien direct vers l'offre (utilise "#" si indisponible)
- tags : tableau des 3-5 compétences principales requises
- matchScore : score de 0 à 100 selon la correspondance avec le profil candidat suivant :
    Poste visé : ${criteria.jobTitle}
    Compétences : ${criteria.skills.slice(0, 8).join(', ')}
    Expérience : ${criteria.yearsExperience || 0} ans

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown ni explication.
Exemple : [{"title":"...","company":"...","location":"...","salary":"...","type":"CDI","remote":false,"description":"...","url":"...","tags":["..."],"matchScore":85}]
`.trim()

  const step2 = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: structurePrompt }] }],
    config: {
      systemInstruction: 'Réponds UNIQUEMENT avec un tableau JSON valide. Aucun markdown, aucun texte avant ou après.',
    },
  })

  let jsonText = (step2.text ?? '').trim()
  jsonText = jsonText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Extraire le tableau JSON même si du texte parasite entoure
  const arrayMatch = jsonText.match(/\[[\s\S]*\]/)
  if (!arrayMatch) throw new Error(`Gemini n'a pas retourné de JSON valide : ${jsonText.slice(0, 200)}`)

  const raw: any[] = JSON.parse(arrayMatch[0])

  return raw.map((r, i) => ({
    id:          `gem_${Date.now()}_${i}`,
    source:      'gemini_search' as any,
    title:       String(r.title || ''),
    company:     String(r.company || ''),
    location:    String(r.location || criteria.location),
    description: String(r.description || ''),
    salary:      String(r.salary || 'Selon profil'),
    type:        (['CDI','CDD','Freelance','Stage','Alternance','Interim'].includes(r.type) ? r.type : 'CDI') as Job['type'],
    remote:      Boolean(r.remote),
    tags:        Array.isArray(r.tags) ? r.tags.map(String) : [],
    url:         String(r.url || '#'),
    logo:        (String(r.company || 'G')[0] || 'G').toUpperCase(),
    postedAt:    'Récemment',
    fetchedAt:   new Date().toISOString(),
    matchScore:  Math.min(100, Math.max(0, Number(r.matchScore) || 0)),
  } satisfies Job))
}
