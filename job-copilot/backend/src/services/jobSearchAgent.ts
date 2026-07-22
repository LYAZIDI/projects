import { getGeminiClient } from './llm'
import type { Job } from '../types'

export interface SearchCriteria {
  skills: string[]
  experience: { title: string; company: string; period: string }[]
  languages: string[]
  yearsExperience?: number
  jobTitle: string
  location: string
  salary?: string
  contractType?: string
  remote?: boolean
}

export async function searchJobsWithGemini(criteria: SearchCriteria): Promise<Job[]> {
  const client = getGeminiClient()

  const expSummary = criteria.experience
    .slice(0, 2)
    .map(e => `${e.title} chez ${e.company}`)
    .join(', ')

  const contractLabel = criteria.remote
    ? `${criteria.contractType || 'CDI'} télétravail`
    : criteria.contractType || 'CDI'

  // Appel unique : grounding + JSON en une seule requête
  const prompt = `
Cherche des offres d'emploi actuelles pour ce profil et réponds UNIQUEMENT avec un tableau JSON valide.

Profil :
- Poste : ${criteria.jobTitle}
- Lieu : ${criteria.location}
- Contrat : ${contractLabel}
${criteria.salary ? `- Salaire : ${criteria.salary}` : ''}
- Compétences : ${criteria.skills.slice(0, 8).join(', ')}
${expSummary ? `- Expérience : ${expSummary}` : ''}

Trouve 8 offres réelles sur LinkedIn, Indeed, Welcome to the Jungle, APEC ou Cadremploi.

Format JSON attendu (tableau, sans markdown) :
[{"title":"...","company":"...","location":"...","salary":"Selon profil","type":"CDI","remote":false,"description":"...","url":"...","tags":["...","..."],"matchScore":85}]

Champs obligatoires : title, company, location, salary, type (CDI|CDD|Freelance|Stage|Alternance), remote (bool), description (1 phrase), url, tags (3-5 items), matchScore (0-100).
`.trim()

  const result = await client.models.generateContent({
    model: 'gemini-flash-latest',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: 'Réponds UNIQUEMENT avec un tableau JSON valide. Pas de markdown, pas de texte avant ou après le tableau.',
    },
  })

  let jsonText = (result.text ?? '').trim()
  jsonText = jsonText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const arrayMatch = jsonText.match(/\[[\s\S]*\]/)
  if (!arrayMatch) throw new Error(`JSON invalide : ${jsonText.slice(0, 200)}`)

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
