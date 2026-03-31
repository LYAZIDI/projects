/**
 * Job Discovery Service — multi-source pipeline
 *
 * Sources (par ordre de priorité) :
 *   1. France Travail (Pôle Emploi) — API officielle gratuite
 *      → Inscription : https://francetravail.io/data/api/offres-emploi
 *   2. Adzuna France — agrège Indeed, Monster, Cadremploi, etc.
 *      → Inscription : https://developer.adzuna.com/
 *   3. Fallback mock pool enrichi (si aucune API configurée)
 *
 * Pipeline : fetch → normalize → deduplicate → persist
 */
import { dbInsertMany, dbGetAll } from '../db/fileDb'
import type { Job, JobSource } from '../types'

// ─── France Travail ───────────────────────────────────────────────────────────

const FT_API_BASE = 'https://api.francetravail.io/partenaire/offresdemploi/v2'
let ftToken: string | null = null
let ftTokenExpiry = 0

async function getFTToken(): Promise<string | null> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  if (ftToken && Date.now() < ftTokenExpiry) return ftToken

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'api_offresdemploiv2 o2dsoffre',
    })
    const res = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token: string; expires_in: number }
    ftToken = data.access_token
    ftTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    console.log('[Discovery] France Travail token OK')
    return ftToken
  } catch {
    return null
  }
}

function normalizeFTOffer(raw: any): Job {
  const salary = raw.salaire
    ? [raw.salaire.libelle, raw.salaire.commentaire].filter(Boolean).join(' — ')
    : 'Salaire selon profil'

  const tags: string[] = []
  if (raw.competences) tags.push(...raw.competences.slice(0, 6).map((c: any) => c.libelle))
  if (raw.langues) tags.push(...raw.langues.slice(0, 2).map((l: any) => l.libelle))
  if (!tags.length && raw.intitule) {
    // Fallback: extract keywords from title
    const titleWords = raw.intitule.split(/[\s,/]+/).filter((w: string) => w.length > 3)
    tags.push(...titleWords.slice(0, 5))
  }

  return {
    id: `ft_${raw.id}`,
    source: 'france_travail' as JobSource,
    title: raw.intitule || 'Sans titre',
    company: raw.entreprise?.nom || 'Entreprise confidentielle',
    location: raw.lieuTravail?.libelle || 'France',
    description: (raw.description || '').slice(0, 500),
    salary,
    type: mapContractType(raw.typeContratLibelle),
    remote: /t[eé]l[eé]travail|remote|distanci[el]/i.test(raw.description || ''),
    tags,
    url: raw.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${raw.id}`,
    logo: (raw.entreprise?.nom?.[0] || 'P').toUpperCase(),
    postedAt: raw.dateCreation ? timeAgo(raw.dateCreation) : 'Récemment',
    fetchedAt: new Date().toISOString(),
    matchScore: 0,
  }
}

function mapContractType(libelle: string = ''): Job['type'] {
  const l = libelle.toLowerCase()
  if (l.includes('cdi')) return 'CDI'
  if (l.includes('cdd')) return 'CDD'
  if (l.includes('freelance') || l.includes('indépendant')) return 'Freelance'
  if (l.includes('stage')) return 'Stage'
  if (l.includes('alternance') || l.includes('apprentissage')) return 'Alternance'
  if (l.includes('intérim')) return 'Interim'
  return 'CDI'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Aujourd\'hui'
  if (days === 1) return 'il y a 1 jour'
  if (days < 7) return `il y a ${days} jours`
  return `il y a ${Math.floor(days / 7)} semaine${days >= 14 ? 's' : ''}`
}

async function fetchFromFranceTravail(skills: string[]): Promise<Job[]> {
  const token = await getFTToken()
  if (!token) return []

  const queries = buildSearchQueries(skills)
  const allJobs: Job[] = []

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        motsCles: query.keywords,
        departement: '75,77,78,91,92,93,94,95', // Île-de-France
        range: '0-29',
        sort: '1',
      })
      const res = await fetch(`${FT_API_BASE}/offres/search?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!res.ok) continue
      const data = await res.json() as { resultats?: any[] }
      allJobs.push(...(data.resultats ?? []).map(normalizeFTOffer))
    } catch { continue }
  }

  console.log(`[Discovery] France Travail: ${allJobs.length} offres récupérées`)
  return allJobs
}

// ─── Adzuna ───────────────────────────────────────────────────────────────────

// Transport/logistics keywords to extract as tags from description
const TRANSPORT_TAGS = [
  'Chauffeur','VTC','Permis B','Permis C','Permis D','Livraison','Conduite',
  'Transport','Manutention','Logistique','Tournées','Service client',
  'Ponctualité','Autonomie','Organisation','FIMO','CACES','SPL',
  'Ambulancier','Coursier','GPS','Sécurité',
]

function extractTagsFromText(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase()
  const found: string[] = []
  for (const tag of TRANSPORT_TAGS) {
    if (text.includes(tag.toLowerCase())) found.push(tag)
  }
  // If no domain tags found, extract meaningful words from title (skip stop words)
  if (found.length < 2) {
    const stopWords = new Set(['les','des','une','pour','dans','avec','sur','par','que','qui','est','son','ses','leur','leurs','emplois','unknown'])
    const words = title.split(/[\s,/()\-–]+/)
      .map(w => w.trim())
      .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()) && !/^\d+$/.test(w))
    found.push(...words.slice(0, 4))
  }
  return [...new Set(found)].slice(0, 6)
}

function normalizeAdzunaOffer(raw: any): Job {
  const title = raw.title || 'Sans titre'
  const desc = (raw.description || '').replace(/<[^>]+>/g, '')
  const tags = extractTagsFromText(title, desc)

  const salary = raw.salary_min && raw.salary_max
    ? `${Math.round(raw.salary_min / 100) * 100} – ${Math.round(raw.salary_max / 100) * 100} €${raw.salary_is_predicted ? '/mois (estimé)' : '/mois'}`
    : 'Salaire selon profil'

  return {
    id: `az_${raw.id}`,
    source: 'france_travail' as JobSource,
    title,
    company: raw.company?.display_name || 'Entreprise',
    location: raw.location?.display_name || 'Île-de-France',
    description: desc.slice(0, 500),
    salary,
    type: 'CDI',
    remote: /remote|télétravail|distanciel/i.test(title + desc),
    tags,
    url: raw.redirect_url || 'https://www.adzuna.fr/',
    logo: (raw.company?.display_name?.[0] || 'A').toUpperCase(),
    postedAt: raw.created ? timeAgo(raw.created) : 'Récemment',
    fetchedAt: new Date().toISOString(),
    matchScore: 0,
  }
}

async function fetchFromAdzuna(skills: string[]): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID
  const apiKey = process.env.ADZUNA_API_KEY
  if (!appId || !apiKey) {
    console.log('[Discovery] Adzuna: clés API non configurées')
    return []
  }

  console.log(`[Discovery] Adzuna: appId=${appId}, clés OK`)
  const queries = buildSearchQueries(skills)
  const allJobs: Job[] = []

  for (const query of queries.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: apiKey,
        results_per_page: '20',
        what: query.keywords,
        where: 'Paris',
        sort_by: 'date',
      })
      const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`
      console.log(`[Discovery] Adzuna fetch: ${query.label} — ${url.slice(0, 100)}…`)
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        const errText = await res.text()
        console.error(`[Discovery] Adzuna erreur ${res.status}: ${errText.slice(0, 200)}`)
        continue
      }
      const data = await res.json() as { results?: any[]; count?: number }
      console.log(`[Discovery] Adzuna "${query.label}": ${data.results?.length ?? 0} offres (total: ${data.count})`)
      allJobs.push(...(data.results ?? []).map(normalizeAdzunaOffer))
    } catch (err) {
      console.error('[Discovery] Adzuna exception:', err)
      continue
    }
  }

  console.log(`[Discovery] Adzuna total: ${allJobs.length} offres récupérées`)
  return allJobs
}

// ─── Smart query builder based on skills ──────────────────────────────────────

function buildSearchQueries(skills: string[]): { keywords: string; label: string }[] {
  const lower = skills.map(s => s.toLowerCase())

  // Detect skill domains
  const isTransport = lower.some(s => ['chauffeur','vtc','livreur','livraison','conduite','transport','permis','taxi','tournée'].includes(s))
  const isTech = lower.some(s => ['react','javascript','python','node','docker','développeur','frontend','backend'].includes(s))
  const isLogistics = lower.some(s => ['logistique','manutention','entrepôt','stock','préparateur'].includes(s))
  const isCompta = lower.some(s => ['comptabilité','sage','bilan','fiscal','comptable'].includes(s))

  const queries: { keywords: string; label: string }[] = []

  if (isTransport) {
    queries.push({ keywords: 'chauffeur VTC', label: 'Chauffeur VTC' })
    queries.push({ keywords: 'chauffeur livreur', label: 'Chauffeur Livreur' })
    queries.push({ keywords: 'conducteur transport', label: 'Conducteur Transport' })
  }
  if (isLogistics) {
    queries.push({ keywords: 'logistique transport Île-de-France', label: 'Logistique' })
    queries.push({ keywords: 'préparateur commandes', label: 'Préparateur commandes' })
  }
  if (isTech) {
    queries.push({ keywords: skills.filter(s => ['React','TypeScript','Python','Node.js'].includes(s)).slice(0, 2).join(' ') || 'développeur web', label: 'Tech' })
  }
  if (isCompta) {
    queries.push({ keywords: 'comptable Sage', label: 'Comptabilité' })
  }

  // Fallback: use top 3 skills as keywords
  if (!queries.length) {
    queries.push({ keywords: skills.slice(0, 3).join(' '), label: 'Compétences' })
  }

  return queries
}

// ─── API status ───────────────────────────────────────────────────────────────

export function getAPIStatus(): { franceTravail: boolean; adzuna: boolean } {
  return {
    franceTravail: !!(process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET),
    adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_API_KEY),
  }
}

// ─── Main discovery pipeline ──────────────────────────────────────────────────

export async function runDiscoveryPipeline(skills: string[] = []): Promise<{ added: number; total: number; sources: string[] }> {
  console.log(`[Discovery] Starting pipeline with skills: ${skills.slice(0, 5).join(', ')}`)

  const fetched: Job[] = []
  const sources: string[] = []

  // 1. France Travail
  const ftJobs = await fetchFromFranceTravail(skills)
  if (ftJobs.length) {
    fetched.push(...ftJobs)
    sources.push(`France Travail (${ftJobs.length})`)
  }

  // 2. Adzuna
  const azJobs = await fetchFromAdzuna(skills)
  if (azJobs.length) {
    fetched.push(...azJobs)
    sources.push(`Adzuna (${azJobs.length})`)
  }

  if (!fetched.length) {
    console.log('[Discovery] No API configured — no new real jobs added')
    return { added: 0, total: dbGetAll('jobs').length, sources: [] }
  }

  // 3. Persist (dedup by id)
  const added = dbInsertMany('jobs', fetched)
  const total = dbGetAll('jobs').length

  console.log(`[Discovery] +${added} new jobs from: ${sources.join(', ')} — total: ${total}`)
  return { added, total, sources }
}

export function getAllStoredJobs(): Job[] {
  return dbGetAll<Job>('jobs')
}

export async function triggerManualDiscovery(skills: string[] = []): Promise<{ added: number; total: number }> {
  return runDiscoveryPipeline(skills)
}
