/**
 * CV DOCX Generator — "Executive Night" template
 * 100% dynamic — all content comes from the CV profile, nothing hardcoded.
 */
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
  LevelFormat, Footer,
} from 'docx'
import type { UserProfile } from './profileService'

// ─── Palette ─────────────────────────────────────────────────────────────────
const NAVY       = '1B2A4A'
const NAVY_DARK  = '162238'
const NAVY_MID   = '243558'
const NAVY_LIGHT = '2E4275'
const TEAL       = '00A896'
const GOLD       = 'C9A84C'
const CHARCOAL   = '2D2D2D'
const SILVER     = 'B0BEC5'
const OFF_WHITE  = 'F0F0F0'
const WHITE      = 'FFFFFF'
const CREAM      = 'FAFAFA'

// ─── Geometry ────────────────────────────────────────────────────────────────
const A4_W = 11906
const A4_H = 16838

// ─── Dynamic data extractors ─────────────────────────────────────────────────

interface RawExp {
  period: string
  title: string
  company: string
  location: string
  bullets: string[]
}

/** Extract experiences from raw text — handles inline dates, "Depuis MM/YYYY" and "De MM/YYYY à MM/YYYY" */
function extractExpsFromRaw(raw: string): RawExp[] {
  if (!raw) return []
  const results: RawExp[] = []
  const lines = raw.split('\n').map(l => l.trim())
  let inSection = false
  let cur: RawExp | null = null
  let skipNext = false

  const MON = '(?:jan(?:v(?:ier)?\\.?)?|f[ée]v(?:rier\\.?)?|mars?|avr(?:il\\.?)?|mai|juin?|juil?(?:let\\.?)?|ao[uû]t?|sep(?:t(?:embre\\.?)?)?|oct(?:obre\\.?)?|nov(?:embre\\.?)?|d[eé]c(?:embre\\.?)?|january|february|march|april|may|june|july|august|september|october|november|december)'

  // Date inline with title/company: "YYYY – YYYY", "07/2022 – présent", "Janvier 2022 – présent"
  const dateRx = new RegExp(
    `\\b(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(20\\d{2}|19\\d{2})\\s*[-–—]\\s*(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(20\\d{2}|19\\d{2}|en\\s*cours|pr[eé]sent|present|maintenant|aujourd['’]hui|current)\\b`,
    'i'
  )

  // Whole-line date: "Depuis 07/2022", "Janvier 2020 – présent"
  const dateLnRx = new RegExp(
    `^\\s*(?:depuis\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2})` +
    `|de\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2})\\s+[àa]u?\\s+(?:${MON}\\s+)?(?:\\d{1,2}\\/)?(?:20\\d{2}|19\\d{2}|pr[eé]sent|present|en\\s*cours|current)` +
    `|(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(?:20\\d{2}|19\\d{2})\\s*[-–—]\\s*(?:${MON}\\s+)?(?:\\d{1,2}[\\/-])?(?:20\\d{2}|19\\d{2}|pr[eé]sent|present|en\\s*cours|current|maintenant|aujourd['’]hui))\\s*$`,
    'i'
  )

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    if (!inSection) {
      const hdr = line.replace(/^[\d\s.•\-–→▪▸■◆*#]+/, '').trim()
      if (/^exp.{0,3}riences?|^parcours.{0,5}professionnel|^emplois?/i.test(hdr) && hdr.length < 70) { inSection = true }
      continue
    }

    const hdr = line.replace(/^[\d\s.•\-–→▪▸■◆*#]+/, '').trim()
    if (/^(formation|comp.{0,3}tence|.{0,2}ducation|langues?|centres?|loisirs?|r.{0,3}f.{0,3}rence)/i.test(hdr) && hdr.length < 70) break

    if (skipNext) { skipNext = false; continue }

    if (dateLnRx.test(line)) {
      // Multi-line format: date is its own line; company = prev non-empty, title = next non-empty
      if (cur?.title) results.push(cur)
      const period = line.trim()
      let prevNonEmpty = ''
      for (let k = i - 1; k >= 0; k--) {
        if (lines[k].trim()) { prevNonEmpty = lines[k].trim(); break }
      }
      let nextNonEmpty = ''
      for (let k = i + 1; k < lines.length; k++) {
        if (lines[k].trim()) { nextNonEmpty = lines[k].trim(); break }
      }
      cur = { period, title: nextNonEmpty, company: prevNonEmpty, location: '', bullets: [] }
      skipNext = true
    } else {
      const dateMatch = line.match(dateRx)
      if (dateMatch) {
        if (cur?.title) results.push(cur)
        const period = dateMatch[0]
        const after = line.slice(line.indexOf(period) + period.length)
          .replace(/^\s*[-–—→|•·\s]+/, '').trim()
        const before = line.slice(0, line.indexOf(period))
          .replace(/[-–—→|•·\s]+$/, '').trim()
        const combined = [before, after].filter(Boolean).join(' ').trim()
        const parts = combined.split(/\s+[-–—|]\s+/)
        const locMatch = (parts[1] || '').match(/\(([^)]+)\)/)
        cur = {
          period,
          title: parts[0]?.replace(/^[•▸■\s]+/, '').trim() || '',
          company: (parts[1] || '').replace(/\s*\([^)]+\)/, '').trim(),
          location: locMatch?.[1] || '',
          bullets: [],
        }
      } else if (cur) {
        if (/^[-•▸■–·]/.test(line)) {
          const b = line.replace(/^[-•▸■–·\s]+/, '').trim()
          if (b.length > 2) cur.bullets.push(b)
        } else if (!cur.company && line.length > 2 && line.length < 80 && !/\d{4}/.test(line)) {
          cur.company = line
        }
      }
    }
  }
  if (cur?.title) results.push(cur)
  return results.slice(0, 5)
}

/** Extract profile summary paragraph from rawText */
function extractSummary(raw: string, skills: string[], yearsExp: number): string {
  if (raw) {
    // Look for a dedicated "Profil" section
    const m = raw.match(/(?:^|\n)\s*profil\s*(?:professionnel|de\s+candidat)?\s*\n+([\s\S]{30,500}?)(?:\n{2,}|\nExp|\nComp|\nFor)/i)
    if (m) return m[1].replace(/\n/g, ' ').trim().slice(0, 400)
  }
  // Generate from structured data (safer than pulling PDF header as summary)
  const top = (skills || []).slice(0, 4).join(', ')
  const exp = yearsExp > 0 ? `${yearsExp} ans d'expérience` : 'Professionnel expérimenté'
  return `${exp} en ${top || 'son domaine'}. Disponible immédiatement.`
}

const NOT_LOCATION = /^(java|spring|angular|react|python|docker|linux|node|git|sql|php|ruby|swift|kotlin|azure|aws|javascript|typescript|golang|scala|mysql|mongodb|redis|jenkins|gitlab|github|maven|gradle|junit|agile|scrum|html|css|sass|vuejs?|nextjs?|nestjs?|express|django|flask|rails|laravel|symfony|kubernetes|terraform|ansible|nginx|apache|jira|confluence|figma|photoshop|illustrator|excel|word|powerpoint|outlook|teams|slack|zoom|dart|flutter|oracle|plsql|bootstrap|jquery|webpack|babel|postman|swagger|bitbucket|trello|notion|uml|json|rest|api|jwt|oauth|jee|hibernate|thymeleaf|reactjs?|vuejs?|svelte|tailwind|linux|windows|android|ios|xcode|gradle|maven)$/i

/** Extract location from rawText (city, region) */
function extractLocation(raw: string): string {
  if (!raw) return ''
  const m = raw.match(/\b([A-ZÀ-Ü][a-zà-ü-]+(?:-[A-ZÀ-Ü][a-zà-ü-]+)*)\s*[|,]\s*([A-ZÀ-Ü][a-zà-ü-]+(?:-[A-ZÀ-Ü][a-zà-ü-]+)*)/m)
  if (m && !NOT_LOCATION.test(m[1]) && !NOT_LOCATION.test(m[2])) return `${m[1]}, ${m[2]}`
  const m2 = raw.match(/\b(Paris|Lyon|Marseille|Bordeaux|Nantes|Lille|Toulouse|Strasbourg|Rennes|Nice|Montpellier|Casablanca|Rabat|Agadir|Marrakech|Montréal|Bruxelles|Île-de-France|Essonne|Hauts-de-Seine|Seine-Saint-Denis|Val-de-Marne)\b/i)
  return m2?.[1] || ''
}

/** Extract licence/certification lines from rawText */
function extractLicences(raw: string): string[] {
  const found: string[] = []
  if (!raw) return found
  if (/permis\s*[ab]/i.test(raw)) found.push('Permis B')
  if (/permis\s*a\b/i.test(raw)) { found[0] = 'Permis A & B' }
  if (/permis\s*c\b/i.test(raw)) found.push('Permis C – Poids lourd')
  if (/carte\s*vtc|autorisation\s*vtc/i.test(raw)) found.push('Carte VTC')
  if (/fimo|fcos/i.test(raw)) found.push('FIMO / Transport')
  if (/caces/i.test(raw)) found.push('CACES')
  if (/véhicule\s*personnel/i.test(raw)) found.push('Véhicule personnel')
  if (/disponible\s*imm/i.test(raw)) found.push('Disponible immédiatement')
  return found
}

/** Separate soft skills from technical skills */
const SOFT_KW = ['ponctualité', 'autonomie', 'organisation', 'communication', 'rigueur',
  'adaptabilité', 'fiabilité', 'discrétion', 'leadership', 'travail en équipe',
  'analyse', 'gestion du stress', 'initiative', 'polyvalence', 'sérieux',
  'réactivité', 'sens du service', 'dynamisme', 'motivation', 'flexibilité']

function splitSkills(skills: string[]): { hard: string[]; soft: string[] } {
  const hard: string[] = []
  const soft: string[] = []
  for (const s of skills) {
    if (SOFT_KW.some(k => s.toLowerCase().includes(k))) soft.push(s)
    else hard.push(s)
  }
  return { hard, soft }
}

// ─── Section / content helpers ───────────────────────────────────────────────

function mainSection(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 4 } },
    children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 20, font: 'Montserrat', color: CHARCOAL, characterSpacing: 50 })],
  })
}

function expBlock(exp: RawExp, _tabW: number): Paragraph[] {
  const out: Paragraph[] = []

  // Company (bold)
  out.push(new Paragraph({
    spacing: { before: 160, after: 8 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: TEAL, space: 8 } },
    indent: { left: 160 },
    children: [
      new TextRun({ text: exp.company || exp.title, bold: true, size: 21, font: 'Montserrat', color: CHARCOAL }),
    ],
  }))

  // Title · Period · Location (subtitle line)
  const subtitleParts = [
    exp.company ? exp.title : '',
    exp.period,
    exp.location,
  ].filter(Boolean)
  if (subtitleParts.length) {
    out.push(new Paragraph({
      spacing: { before: 0, after: 60 },
      border: { left: { style: BorderStyle.SINGLE, size: 16, color: TEAL, space: 8 } },
      indent: { left: 160 },
      children: [new TextRun({ text: subtitleParts.join('  ·  '), size: 19, font: 'Calibri', color: TEAL, italics: true })],
    }))
  }

  // Bullets
  for (const b of exp.bullets.slice(0, 5)) {
    out.push(new Paragraph({
      spacing: { before: 30, after: 30 },
      indent: { left: 360, hanging: 200 },
      children: [
        new TextRun({ text: '■  ', size: 16, font: 'Calibri', color: TEAL }),
        new TextRun({ text: b, size: 19, font: 'Calibri', color: CHARCOAL }),
      ],
    }))
  }

  // Separator
  out.push(new Paragraph({
    spacing: { before: 80, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E0E0E0', space: 0 } },
    children: [],
  }))

  return out
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateCVDocx(profile: UserProfile): Promise<Buffer> {
  const cv = profile.cv
  const cvAny = cv as any
  const rawText: string = cvAny.rawText || ''
  const skills: string[] = cv.skills || []
  const { hard: hardSkills, soft: softSkills } = splitSkills(skills)

  const name = cv.name || 'Candidat'
  const location = extractLocation(rawText)
  // Use pre-computed summary (translated CV) if available, else extract from rawText
  const summary = (cvAny.summary as string | undefined)?.trim() || extractSummary(rawText, skills, cv.yearsExperience || 0)
  const licences = extractLicences(rawText)
  const sector: string = cvAny.sector || 'generic'
  const sectorLabel = sector === 'transport' ? 'Transport & VTC'
    : sector === 'tech' ? 'Tech & Dev'
    : sector === 'compta' ? 'Comptabilité'
    : sector === 'commerce' ? 'Commerce'
    : ''

  // Experiences: rawText extraction for bullets, but cv.experience is authoritative for count
  const parsedExps = cv.experience || []
  // Prefer DB-stored experiences (populated by parser on upload); fall back to rawText extraction
  let exps: RawExp[]
  if (parsedExps.length > 0) {
    exps = parsedExps.map(e => ({
      period: e.period,
      title: e.title,
      company: e.company,
      location: '',
      bullets: e.description ? e.description.split(' • ').filter(Boolean) : [],
    }))
  } else {
    exps = extractExpsFromRaw(rawText)
    console.log(`[DOCX] extractExpsFromRaw found ${exps.length} exps from rawText (len=${rawText.length})`)
  }

  // Job title: from first experience, else from sector
  const jobTitle = (exps[0]?.title && exps[0].title.length < 60 ? exps[0].title : '')
    || (sector === 'transport' ? 'Conducteur Professionnel' : skills[0] || '')

  // Languages
  const langs: string[] = (cv.languages || []).length > 0 ? cv.languages : []

  // ── DOCUMENT BODY — linear text layout ───────────────────────────────────
  const body: Paragraph[] = []

  // Name
  body.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: name.toUpperCase(), bold: true, size: 64, font: 'Montserrat', color: NAVY })],
  }))

  // Title
  if (jobTitle) {
    body.push(new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: jobTitle, size: 26, font: 'Montserrat', color: TEAL, characterSpacing: 40 })],
    }))
  }

  // Contact line: sector · location · phone · email  (gold underline)
  const headerParts: string[] = []
  if (sectorLabel) headerParts.push('★ ' + sectorLabel)
  if (location)    headerParts.push(location)
  if (cv.phone)    headerParts.push(cv.phone)
  if (cv.email)    headerParts.push(cv.email)
  body.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 } },
    children: headerParts.map((p, i) =>
      new TextRun({ text: (i ? '   ·   ' : '') + p, size: 19, font: 'Calibri', color: CHARCOAL })
    ),
  }))

  // Profile
  body.push(mainSection('Profil Professionnel'))
  body.push(new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text: summary, size: 20, font: 'Calibri', color: CHARCOAL, italics: true })],
  }))

  // Experience
  body.push(mainSection('Expérience Professionnelle'))
  if (exps.length === 0) {
    body.push(new Paragraph({
      children: [new TextRun({ text: 'Voir CV original pour les détails.', size: 19, font: 'Calibri', color: SILVER })],
    }))
  } else {
    for (const exp of exps) body.push(...expBlock(exp, A4_W))
  }

  // Education
  if ((cv.education || []).length > 0) {
    body.push(mainSection('Formation'))
    for (const edu of (cv.education || []).slice(0, 4)) {
      body.push(new Paragraph({
        spacing: { before: 80, after: 20 },
        children: [new TextRun({ text: edu.degree, bold: true, size: 20, font: 'Calibri', color: CHARCOAL })],
      }))
      const sub = [edu.school, edu.year].filter(Boolean).join(' · ')
      if (sub) {
        body.push(new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: sub, size: 18, font: 'Calibri', color: TEAL })],
        }))
      }
    }
  }

  // Skills
  if (hardSkills.length > 0) {
    body.push(mainSection('Compétences'))
    body.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: hardSkills.slice(0, 16).map((s, i) =>
        new TextRun({ text: (i ? '  ·  ' : '') + s, size: 19, font: 'Calibri', color: CHARCOAL })
      ),
    }))
  }

  // Languages
  if (langs.length > 0) {
    body.push(mainSection('Langues'))
    body.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: langs.map((l, i) =>
        new TextRun({ text: (i ? '  ·  ' : '') + l, size: 19, font: 'Calibri', color: CHARCOAL })
      ),
    }))
  }

  // Licences
  if (licences.length > 0) {
    body.push(mainSection('Permis & Licences'))
    body.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: licences.map((l, i) =>
        new TextRun({ text: (i ? '  ·  ' : '') + l, size: 19, font: 'Calibri', color: CHARCOAL })
      ),
    }))
  }

  // Soft skills / qualities
  if (softSkills.length > 0) {
    body.push(mainSection('Qualités'))
    body.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: softSkills.slice(0, 6).map((q, i) =>
        new TextRun({ text: (i ? '  ·  ' : '') + q, size: 19, font: 'Calibri', color: CHARCOAL })
      ),
    }))
  }

  // Interests
  const interestMatch = rawText.match(/(?:centres?.{0,5}d.int.{0,5}r|loisirs?)\s*\n+([\s\S]{5,300}?)(?:\n\n\n|$)/i)
  if (interestMatch) {
    const items = interestMatch[1].split('\n')
      .map(l => l.replace(/^[-•▸→\s]+/, '').trim())
      .filter(l => l.length > 1 && l.length < 40)
      .slice(0, 6)
    if (items.length) {
      body.push(mainSection("Centres d'intérêt"))
      body.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        children: items.map((item, i) =>
          new TextRun({ text: (i ? '   ·   ' : '') + item, size: 19, font: 'Calibri', color: CHARCOAL })
        ),
      }))
    }
  }

  const pageProps = {
    size: { width: A4_W, height: A4_H },
    margin: { top: 1440, right: 1800, bottom: 1440, left: 1800, header: 0, footer: 400 },
  }

  const footerEl = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'JobCopilot  ·  ', size: 15, color: SILVER, font: 'Calibri' }),
        new TextRun({ text: name, size: 15, color: TEAL, font: 'Calibri' }),
        ...(cvAny.atsScore ? [new TextRun({ text: `  ·  Score ATS ${cvAny.atsScore}/100`, size: 15, color: SILVER, font: 'Calibri' })] : []),
      ],
    })],
  })

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Calibri', size: 19, color: CHARCOAL } } },
      paragraphStyles: [{
        id: 'Normal', name: 'Normal', run: {},
        paragraph: { spacing: { before: 0, after: 0 } },
      }],
    },
    sections: [{
      properties: { page: pageProps },
      footers: { default: footerEl },
      children: body,
    }],
  })

  return await Packer.toBuffer(doc)
}
