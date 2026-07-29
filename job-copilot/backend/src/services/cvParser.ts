// Import pdf-parse directly from lib to avoid the test-file loading bug in serverless
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js')
import mammoth from 'mammoth'
import type { ParsedCV, ExperienceItem, EducationItem } from '../types'

// ─── Section headers ──────────────────────────────────────────────────────────
// Use flexible patterns (.{0,3}) to handle encoding corruption (e.g. é → Ǹ from PDF/DOCX garbling)

// \b word boundary prevents matching "IntérimExpérience" or "CDI/Expérience" mid-word
// Anchored with ^ so "11 ans d'expérience" in a summary line won't trigger section detection
const SECTION_EXP    = /^exp.{0,3}riences?|^parcours.{0,5}professionnel|^emplois?/i
const SECTION_EDU    = /^(formations?|.{0,2}ducations?|dipl.{0,3}mes?|.{0,2}tudes?)/i
const SECTION_SKILLS = /^(comp.{0,3}tences?.{0,10}(cl.{0,2}s?)?|skills?)/i
// "projets?" removed: "Projet :" appears inside experience descriptions and would cut the section early
const SECTION_ANY    = /^(exp.{0,3}riences?|formations?|comp.{0,3}tences?|.{0,2}ducations?|langues?|centres?|loisirs?|r.{0,3}f.{0,3}rences?)/i

// ─── Text extractor ───────────────────────────────────────────────────────────

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (
    mimetype === 'application/pdf' ||
    mimetype === 'application/octet-stream'
  ) {
    try {
      const result = await pdfParse(buffer)
      return result.text
    } catch {
      throw new Error("Impossible de lire le PDF. Vérifiez que le fichier n'est pas protégé.")
    }
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  throw new Error('Format non supporté. Utilisez PDF ou DOCX.')
}

// ─── Section splitter ─────────────────────────────────────────────────────────
// Returns the text block between a section header and the next one

/** Strip leading non-letter chars (numbers, bullets, punctuation) before section header matching */
function normalizeHeader(line: string): string {
  return line.replace(/^[\d\s.•\-–→▪▸■◆*#]+/, '').trim()
}

function getSection(text: string, headerRx: RegExp): string {
  const lines = text.split('\n')
  let start = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const hdr = normalizeHeader(line)
    if (start === -1) {
      if (headerRx.test(hdr) && hdr.length < 60) { start = i + 1 }
    } else {
      // Stop at next section header (short line matching any section keyword)
      const nextHdr = normalizeHeader(line)
      if (nextHdr.length < 60 && SECTION_ANY.test(nextHdr) && !headerRx.test(nextHdr)) {
        return lines.slice(start, i).join('\n')
      }
    }
  }
  return start !== -1 ? lines.slice(start).join('\n') : ''
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function clean(raw: string): string {
  return raw.replace(/^[\s•\-–:*·▪▸◦\d.]+/, '').replace(/\s+/g, ' ').trim()
}

// ─── Name detection ───────────────────────────────────────────────────────────

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines.slice(0, 6)) {
    if (line.length < 4 || line.length > 60) continue
    if (/[@\d]/.test(line)) continue

    // Split on tab or transition from uppercase to Title case (DOCX tab issue)
    // e.g. "LAHCEN ACHAFIChauffeur Livreur" → split before capital after lowercase
    const normalized = line
      .replace(/\t.*/g, '')                         // remove tab and everything after
      // "ACHAFIChauffeur" → split where ALL-CAPS block meets TitleCase (no space between)
      .replace(/([A-ZÁÉÈÊËÀÂÙÛÜÔÎÏÇŒÆ]{2,})([A-ZÁÉÈÊËÀÂÙÛÜÔÎÏÇŒÆ][a-zà-ü])/, '$1\t$2')
      // "FooBar" → "Foo\tBar" (CamelCase)
      .replace(/([A-ZÀ-Ü][a-zà-ü]+)([A-ZÀ-Ü])/, '$1\t$2')
      .split('\t')[0]
      .trim()

    const words = normalized.split(/\s+/)
    if (
      words.length >= 2 && words.length <= 5 &&
      words.every(w => /^[A-ZÁÉÈÊËÀÂÙÛÜÔÎÏÇŒÆA-Z]/i.test(w)) &&
      !SECTION_ANY.test(normalized)
    ) {
      return normalized
    }
  }
  return 'Nom non détecté'
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function extractEmail(text: string): string {
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
  return m ? m[0] : ''
}

function extractPhone(text: string): string {
  const m = text.match(/(\+?\d[\d\s.\-()]{7,14}\d)/)
  return m ? m[1].replace(/\s+/g, ' ').trim() : ''
}

// ─── Skills ───────────────────────────────────────────────────────────────────

const TECH_SKILLS = [
  'JavaScript','TypeScript','Python','Java','C#','C++','Go','Rust','PHP','Ruby','Swift','Kotlin',
  'React','Vue','Angular','Next.js','Nuxt','Svelte',
  'Node.js','Express','NestJS','Django','FastAPI','Spring','Laravel',
  'PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','SQLite','Oracle',
  'Docker','Kubernetes','AWS','GCP','Azure','Terraform',
  'Git','GitHub','GitLab','CI/CD','Jenkins',
  'REST','GraphQL','gRPC','OAuth','JWT',
  'Tailwind','Bootstrap','CSS','SCSS','HTML',
  'React Native','Flutter',
  'Linux','Bash','PowerShell',
  'Excel','Word','PowerPoint','Office','Sage','SAP','Salesforce',
]

const DOMAIN_SKILLS = [
  'Logistique','Manutention','Livraison','Transport','Conduite','Tournées',
  'Chauffeur','VTC','Permis B','Permis C','Chauffeur-livreur',
  'Relation client','Service client','Comptabilité','Gestion',
  'Commerce','Vente','Négociation','Management','Recrutement',
  'Marketing','Communication','Autonomie','Organisation','Ponctualité',
  'Cuisine','Restauration','Hôtellerie','Sécurité','Maintenance',
  'Electricité','Plomberie','Menuiserie','BTP','Architecture',
  'Médecine','Soins','Infirmier','Pharmacie','Juridique','Comptable',
  'Agile','Scrum','Kanban','Leadership','Teamwork','Analyse',
]

function extractSkills(text: string): string[] {
  const found = new Set<string>()
  const skillsSection = getSection(text, SECTION_SKILLS) || text

  for (const skill of [...TECH_SKILLS, ...DOMAIN_SKILLS]) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(`\\b${escaped}\\b`, 'i')
    if (rx.test(skillsSection) || rx.test(text)) found.add(skill)
  }
  return Array.from(found).slice(0, 20)
}

// ─── Experience ───────────────────────────────────────────────────────────────

// Month name prefix for dates (FR/EN)
const MON = '(?:jan(?:v(?:ier)?|\\.)?|f[ée]v(?:rier|\\.)?|mars?|avr(?:il|\\.)?|mai|juin?|juil?(?:let|\\.)?|ao[uû]t?|sep(?:t(?:embre|\\.)?|\\.)?|oct(?:obre|\\.)?|nov(?:embre|\\.)?|d[eé]c(?:embre|\\.)?|january|february|march|april|may|june|july|august|september|october|november|december)'

// Matches a date range inline with title/company: "YYYY – YYYY", "07/2022 – présent", "Janvier 2022 – présent"
const DATE_RX = new RegExp(
  `\\b(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(20\\d{2}|19\\d{2})\\s*[-–—]\\s*(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(20\\d{2}|19\\d{2}|pr[eé]sent|present|aujourd['\\u2019]hui|current|en\\s*cours|maintenant)\\b`,
  'gi'
)

// Matches a whole line that is purely a date: "Depuis 07/2022", "Janvier 2020 – présent"
const DATE_LINE_RX = new RegExp(
  `^\\s*(?:depuis\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2})` +
  `|de\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2})\\s+[àa]u?\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2}|pr[eé]sent|present|en\\s*cours|current)` +
  `|(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(?:20\\d{2}|19\\d{2})\\s*[-–—]\\s*(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(?:20\\d{2}|19\\d{2}|pr[eé]sent|present|aujourd['\\u2019]hui|current|en\\s*cours|maintenant))\\s*$`,
  'i'
)

// Applied only to date lines to skip education entries (not to job titles or company names)
const EDU_LINE_RX = /\b(bts|dut|bac\b|bac\+|master|licence|bachelor|mba|phd|doctorat|cap\b|formation|diplôme|diplome|certificat)\b/i

function extractExperience(text: string): ExperienceItem[] {
  const results: ExperienceItem[] = []

  const section = getSection(text, SECTION_EXP)
  if (!section) return []

  const lines = section.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip date lines that belong to education (e.g. "Master 2018 – 2020")
    if (EDU_LINE_RX.test(line)) continue

    const isDateLine = DATE_LINE_RX.test(line)
    DATE_RX.lastIndex = 0
    const inlineDateMatch = !isDateLine ? line.match(DATE_RX) : null
    DATE_RX.lastIndex = 0

    if (!isDateLine && !inlineDateMatch) continue

    let period: string
    let title = ''
    let company = ''
    let bulletStartIdx: number

    if (isDateLine) {
      // Multi-line format: date is its own line; company = previous lines (up to 2 for long names), title = next line
      period = line.trim()
      // Collect up to 2 lines backwards as company name (handles "ASIS - BRUNEAU - SAINT\nETIENNE")
      const companyParts: string[] = []
      for (let k = i - 1; k >= 0 && k >= i - 2; k--) {
        const prev = lines[k]
        if (!prev || DATE_LINE_RX.test(prev) || /^[-•▸■]/.test(prev)) break
        if (prev.length > 80) break
        companyParts.unshift(prev)
      }
      company = clean(companyParts.join(' '))
      if (i + 1 < lines.length && !DATE_LINE_RX.test(lines[i + 1])) {
        title = clean(lines[i + 1])
      }
      bulletStartIdx = i + 2
    } else {
      // Inline format: date, title and company are on the same line
      period = inlineDateMatch![0]
      const remainder = line.replace(period, '').replace(/^[\s•\-–:*·▪]+/, '').trim()
      const parts = remainder.split(/\s+[-–]\s+/)
      title = clean(parts[0] || '')
      company = parts.length > 1 ? clean(parts.slice(1).join(' – ')) : ''
      if (!title && lines[i + 1]) title = clean(lines[i + 1])
      bulletStartIdx = i + 1
    }

    // Collect bullet descriptions from following lines
    const descLines: string[] = []
    let j = bulletStartIdx
    while (j < lines.length && j < bulletStartIdx + 6) {
      const next = lines[j]
      if (DATE_LINE_RX.test(next)) break
      DATE_RX.lastIndex = 0
      if (DATE_RX.test(next)) break
      DATE_RX.lastIndex = 0
      if (/^[\s•\-–]+/.test(next)) descLines.push(clean(next))
      j++
    }

    if (title.length > 1) {
      results.push({
        title: title.slice(0, 80),
        company: company.slice(0, 80),
        period,
        description: descLines.join(' • ').slice(0, 200),
      })
    }
    if (results.length >= 5) break
  }

  return results
}

// ─── Education ────────────────────────────────────────────────────────────────

const EDU_KEYWORDS = ['master','licence','bachelor','bts','dut','bac','mba','ingénieur','engineer','phd','doctorat','formation','diplôme','degree','certificat','vtc','cap','bp ']

function extractEducation(text: string): EducationItem[] {
  const results: EducationItem[] = []
  const section = getSection(text, SECTION_EDU) || text
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (!EDU_KEYWORDS.some(k => lower.includes(k))) continue

    const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/)
    const degree = clean(line.replace(/\d{4}[-–]\d{4}|\d{4}\s*:/g, '')).slice(0, 100)
    if (degree.length > 3) {
      results.push({ degree, school: '', year: yearMatch ? yearMatch[0] : '' })
      if (results.length >= 4) break
    }
  }
  return results
}

// ─── Years of experience ──────────────────────────────────────────────────────

function estimateYearsExperience(experiences: ExperienceItem[]): number {
  if (!experiences.length) return 0
  const years: number[] = []
  for (const exp of experiences) {
    const matches = exp.period.match(/\b(20\d{2}|19\d{2})\b/g) || []
    matches.forEach(y => years.push(parseInt(y)))
    if (/présent|present|cours|current/i.test(exp.period)) years.push(new Date().getFullYear())
  }
  if (years.length < 2) return 0
  return Math.min(Math.max(...years) - Math.min(...years), 40)
}

// ─── ATS Score (sector-aware) ─────────────────────────────────────────────────

const ATS_SECTORS: Record<string, { keywords: string[]; label: string }> = {
  transport: {
    label: 'Transport & Logistique',
    keywords: [
      'permis','conduite','véhicule','livraison','client','ponctualité',
      'tournée','sécurité','autonomie','organisation','trajet','itinéraire',
      'manutention','chargement','horaires','disponible',
    ],
  },
  tech: {
    label: 'Développement / Tech',
    keywords: [
      'développement','code','application','api','base de données','git',
      'agile','test','déploiement','architecture','performance','sprint',
      'équipe','livraison','itération','documentation',
    ],
  },
  compta: {
    label: 'Comptabilité / Finance',
    keywords: [
      'comptabilité','bilan','fiscalité','clôture','rapprochement','sage',
      'budget','facturation','trésorerie','audit','déclaration','rigueur',
      'organisation','reporting','excel','analyse',
    ],
  },
  commerce: {
    label: 'Commerce / Vente',
    keywords: [
      'client','vente','objectif','prospection','négociation','fidélisation',
      'chiffre','portefeuille','offre','relation','autonomie','terrain',
      'résultat','performance','crm','suivi',
    ],
  },
  generic: {
    label: 'Polyvalent',
    keywords: [
      'expérience','compétences','formation','responsabilité','résultat',
      'performance','équipe','collaboration','objectif','client',
      'autonomie','organisation','rigueur','communication','projet','livraison',
    ],
  },
}

function detectSector(skills: string[], text: string): string {
  const lower = text.toLowerCase()
  const transportKw = ['chauffeur','vtc','livraison','conduite','transport','permis','tournée','manutention']
  const techKw = ['react','javascript','python','node','docker','git','api','sql','développeur']
  const comptaKw = ['comptabilité','sage','fiscal','bilan','clôture','trésorerie']
  const commerceKw = ['vente','commercial','négociation','prospection','crm']

  const score = (kws: string[]) => kws.filter(k => lower.includes(k) || skills.some(s => s.toLowerCase().includes(k))).length

  const scores = {
    transport: score(transportKw),
    tech: score(techKw),
    compta: score(comptaKw),
    commerce: score(commerceKw),
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return top[1] >= 2 ? top[0] : 'generic'
}

function calculateATS(text: string, skills: string[]): { score: number; found: string[]; missing: string[]; sector: string } {
  const sector = detectSector(skills, text)
  const { keywords } = ATS_SECTORS[sector] ?? ATS_SECTORS.generic
  const lower = text.toLowerCase()
  const found: string[] = []
  const missing: string[] = []

  for (const kw of keywords) {
    if (lower.includes(kw)) found.push(kw)
    else missing.push(kw)
  }

  const skillsScore = Math.min(skills.length * 4, 50)
  const kwScore     = Math.round((found.length / keywords.length) * 32)
  const lengthBonus = text.length > 600 ? 18 : 8

  return {
    score:   Math.min(skillsScore + kwScore + lengthBonus, 100),
    found:   [...new Set(found)].slice(0, 8),
    missing: missing.filter(m => !found.includes(m)).slice(0, 5),
    sector,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function parseCV(buffer: Buffer, mimetype: string): Promise<ParsedCV> {
  const rawText = await extractText(buffer, mimetype)

  const name       = extractName(rawText)
  const email      = extractEmail(rawText)
  const phone      = extractPhone(rawText)
  const skills     = extractSkills(rawText)
  const experience = extractExperience(rawText)
  const education  = extractEducation(rawText)
  const languages  = [
    { rx: /\b(français|french)\b/i,    label: 'Français' },
    { rx: /\b(anglais|english)\b/i,    label: 'Anglais' },
    { rx: /\b(espagnol|spanish)\b/i,   label: 'Espagnol' },
    { rx: /\b(allemand|german)\b/i,    label: 'Allemand' },
    { rx: /\b(arabe|arabic)\b/i,       label: 'Arabe' },
    { rx: /\b(chinois|mandarin)\b/i,   label: 'Chinois' },
    { rx: /\b(portugais|portuguese)\b/i, label: 'Portugais' },
  ].filter(l => l.rx.test(rawText)).map(l => l.label)

  const yearsExperience = estimateYearsExperience(experience)
  const { score, found, missing, sector } = calculateATS(rawText, skills)

  const result: any = {
    rawText: rawText.slice(0, 8000),
    name, email, phone, skills,
    experience, education, languages,
    atsScore: score,
    atsKeywordsFound: found,
    atsMissing: missing,
    yearsExperience,
    sector,
  }
  return result
}
