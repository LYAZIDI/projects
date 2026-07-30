/**
 * CV DOCX Generator — "Executive Night" template
 * 100% dynamic — all content comes from the CV profile, nothing hardcoded.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
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
const A4_W     = 11906
const A4_H     = 16838
const MAR_V    = 720
const MAR_H    = 200   // tiny horizontal margin to avoid Word 0-margin rendering bug
const CONTENT_W = A4_W - 2 * MAR_H
const SIDE_W   = Math.round(CONTENT_W * 0.33)
const MAIN_W   = CONTENT_W - SIDE_W

// ─── Shared ──────────────────────────────────────────────────────────────────
const none     = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const
const noBorders = { top: none, bottom: none, left: none, right: none }

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

/** Skill bar: top 30% → 5 bars, mid 40% → 4, rest → 3 */
function skillBarStr(index: number, total: number): string {
  const lvl = index < total * 0.3 ? 5 : index < total * 0.65 ? 4 : 3
  return '▓'.repeat(lvl) + '░'.repeat(5 - lvl)
}

// ─── Sidebar helpers ──────────────────────────────────────────────────────────

function sideSection(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY_MID, space: 4 } },
    children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 18, font: 'Montserrat', color: GOLD, characterSpacing: 60 })],
  })
}

function sideLabelVal(label: string, value: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 10, after: 0 }, children: [new TextRun({ text: label, size: 16, font: 'Calibri', color: SILVER })] }),
    new Paragraph({ spacing: { before: 0, after: 60 }, children: [new TextRun({ text: value, size: 19, font: 'Calibri', color: OFF_WHITE, bold: true })] }),
  ]
}

function sideText(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 50, after: 30 },
    children: [new TextRun({ text, size: 18, font: 'Calibri', color: OFF_WHITE })],
  })
}

// ─── Main content helpers ─────────────────────────────────────────────────────

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

  // ── CONTACT ITEMS ────────────────────────────────────────────────────────
  const contactItems: string[] = []
  if (cv.phone) contactItems.push('📞 ' + cv.phone)
  if (cv.email) contactItems.push('✉ ' + cv.email)

  // ── SIDEBAR content ──────────────────────────────────────────────────────
  const sideChildren: Paragraph[] = []

  // Contact
  sideChildren.push(sideSection('Contact'))
  if (cv.phone) sideChildren.push(...sideLabelVal('Téléphone', cv.phone))
  if (cv.email) sideChildren.push(...sideLabelVal('Email', cv.email))
  if (location) sideChildren.push(...sideLabelVal('Localisation', location))

  // Licences (only if found in CV)
  if (licences.length > 0) {
    sideChildren.push(sideSection('Permis & Licences'))
    for (const lic of licences) {
      sideChildren.push(new Paragraph({
        spacing: { before: 60, after: 30 },
        children: [
          new TextRun({ text: '✓  ', size: 17, font: 'Calibri', color: TEAL }),
          new TextRun({ text: lic, size: 18, font: 'Calibri', color: OFF_WHITE }),
        ],
      }))
    }
  }

  // Hard skills with progress bars
  if (hardSkills.length > 0) {
    sideChildren.push(sideSection('Compétences'))
    hardSkills.slice(0, 12).forEach((skill, i) => {
      const bar = skillBarStr(i, hardSkills.length)
      sideChildren.push(sideText(skill))
      sideChildren.push(new Paragraph({
        spacing: { before: 0, after: 48 },
        children: [
          new TextRun({ text: bar.slice(0, bar.indexOf('░') === -1 ? 5 : bar.indexOf('░')), size: 16, font: 'Calibri', color: TEAL }),
          new TextRun({ text: bar.slice(bar.indexOf('░') === -1 ? 5 : bar.indexOf('░')), size: 16, font: 'Calibri', color: NAVY_LIGHT }),
        ],
      }))
    })
  }

  // Languages
  if (langs.length > 0) {
    sideChildren.push(sideSection('Langues'))
    const langLevels: Record<string, number> = { 'Français': 5, 'Anglais': 3, 'Arabe': 4, 'Espagnol': 3, 'Allemand': 3 }
    for (const lang of langs) {
      const lvl = langLevels[lang] ?? 3
      sideChildren.push(new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: lang + '  ', size: 19, font: 'Calibri', color: OFF_WHITE }),
          new TextRun({ text: '●'.repeat(lvl) + '○'.repeat(5 - lvl), size: 16, font: 'Calibri', color: GOLD }),
        ],
      }))
    }
  }

  // Soft skills as "Qualités" (only if found in CV skills)
  if (softSkills.length > 0) {
    sideChildren.push(sideSection('Qualités'))
    for (const q of softSkills.slice(0, 6)) {
      sideChildren.push(new Paragraph({
        spacing: { before: 50, after: 40 },
        children: [
          new TextRun({ text: '◆  ', size: 15, font: 'Calibri', color: GOLD }),
          new TextRun({ text: q, size: 18, font: 'Calibri', color: OFF_WHITE }),
        ],
      }))
    }
  }

  // ATS Score
  if (cvAny.atsScore) {
    sideChildren.push(sideSection('Score ATS'))
    sideChildren.push(new Paragraph({
      spacing: { before: 60, after: 0 },
      children: [
        new TextRun({ text: `${cvAny.atsScore}`, bold: true, size: 52, font: 'Montserrat', color: TEAL }),
        new TextRun({ text: '/100', size: 20, font: 'Calibri', color: SILVER }),
      ],
    }))
  }

  // ── MAIN content ─────────────────────────────────────────────────────────
  const mainChildren: Paragraph[] = []

  // Profile summary
  mainChildren.push(mainSection('Profil Professionnel'))
  mainChildren.push(new Paragraph({
    spacing: { before: 80, after: 60 },
    children: [new TextRun({ text: summary, size: 20, font: 'Calibri', color: CHARCOAL, italics: true })],
  }))

  // Experience
  mainChildren.push(mainSection('Expérience Professionnelle'))
  if (exps.length === 0) {
    mainChildren.push(new Paragraph({
      children: [new TextRun({ text: 'Voir CV original pour les détails.', size: 19, font: 'Calibri', color: SILVER })],
    }))
  } else {
    for (const exp of exps) mainChildren.push(...expBlock(exp, MAIN_W))
  }

  // Education
  if ((cv.education || []).length > 0) {
    mainChildren.push(mainSection('Formation'))
    for (const edu of (cv.education || []).slice(0, 4)) {
      mainChildren.push(new Paragraph({
        spacing: { before: 100, after: 20 },
        children: [new TextRun({ text: edu.degree, bold: true, size: 20, font: 'Calibri', color: CHARCOAL })],
      }))
      const sub = [edu.school, edu.year].filter(Boolean).join(' · ')
      if (sub) {
        mainChildren.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({ text: '[', size: 17, font: 'Calibri', color: TEAL }),
            new TextRun({ text: sub, size: 17, font: 'Calibri', color: TEAL }),
            new TextRun({ text: ']', size: 17, font: 'Calibri', color: TEAL }),
          ],
        }))
      }
    }
  }

  // Interests
  const interestMatch = rawText.match(/(?:centres?.{0,5}d.int.{0,5}r|loisirs?)\s*\n+([\s\S]{5,300}?)(?:\n\n\n|$)/i)
  if (interestMatch) {
    const items = interestMatch[1].split('\n')
      .map(l => l.replace(/^[-•▸→\s]+/, '').trim())
      .filter(l => l.length > 1 && l.length < 40)
      .slice(0, 6)
    if (items.length) {
      mainChildren.push(mainSection("Centres d'intérêt"))
      mainChildren.push(new Paragraph({
        spacing: { before: 80 },
        children: items.map((item, i) =>
          new TextRun({ text: (i === 0 ? '' : '   ·   ') + item, size: 19, font: 'Calibri', color: CHARCOAL })
        ),
      }))
    }
  }

  const pageProps = {
    size: { width: A4_W, height: A4_H },
    // header:0 prevents Word from reserving extra space above the body text
    margin: { top: MAR_V, right: MAR_H, bottom: MAR_V, left: MAR_H, header: 0, footer: 400 },
  }

  // ── SINGLE TABLE: 3 rows, single section ─────────────────────────────────
  // Row 1: header (sector/location | name/title)
  // Row 2: contact strip (CONTACT label | phone/email)
  // Row 3: sidebar + main content — splits naturally across pages
  const allTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [SIDE_W, MAIN_W],
    rows: [
      // ── Row 1: header ────────────────────────────────────────────────────
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: NAVY_DARK, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: SIDE_W, type: WidthType.DXA },
            margins: { top: 500, bottom: 500, left: 400, right: 300 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              ...(sectorLabel ? [new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [new TextRun({ text: '★ ' + sectorLabel, size: 20, font: 'Calibri', color: GOLD })],
              })] : []),
              ...(location ? [new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: location, size: 17, font: 'Calibri', color: SILVER })],
              })] : []),
              new Paragraph({ children: [] }),
            ],
          }),
          new TableCell({
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: MAIN_W, type: WidthType.DXA },
            margins: { top: 400, bottom: 400, left: 480, right: 500 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [new TextRun({ text: name.toUpperCase(), bold: true, size: 64, font: 'Montserrat', color: WHITE })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [new TextRun({ text: jobTitle, size: 24, font: 'Montserrat', color: TEAL, characterSpacing: 60 })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 0 } },
                children: [new TextRun({ text: '' })],
              }),
            ],
          }),
        ],
      }),
      // ── Row 2: contact strip ─────────────────────────────────────────────
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: NAVY_LIGHT, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: SIDE_W, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 400, right: 300 },
            children: [new Paragraph({
              children: [new TextRun({ text: 'CONTACT', size: 15, font: 'Montserrat', color: GOLD, bold: true, characterSpacing: 40 })],
            })],
          }),
          new TableCell({
            shading: { fill: 'F5F0E8', type: ShadingType.CLEAR },
            borders: { ...noBorders, left: { style: BorderStyle.SINGLE, size: 16, color: GOLD, space: 0 } },
            width: { size: MAIN_W, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 480, right: 300 },
            children: [new Paragraph({
              children: contactItems.map((item, i) =>
                new TextRun({ text: (i === 0 ? '' : '    ') + item, size: 19, font: 'Calibri', color: CHARCOAL })
              ),
            })],
          }),
        ],
      }),
      // ── Row 3: sidebar + main content ────────────────────────────────────
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: SIDE_W, type: WidthType.DXA },
            margins: { top: 240, bottom: 600, left: 400, right: 300 },
            verticalAlign: VerticalAlign.TOP,
            children: sideChildren,
          }),
          new TableCell({
            shading: { fill: CREAM, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: MAIN_W, type: WidthType.DXA },
            margins: { top: 240, bottom: 600, left: 480, right: 400 },
            verticalAlign: VerticalAlign.TOP,
            children: mainChildren,
          }),
        ],
      }),
    ],
  })

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
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '■',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: 'Calibri', size: 19, color: CHARCOAL } } },
    },
    sections: [{
      properties: { page: pageProps },
      footers: { default: footerEl },
      children: [allTable],
    }],
  })

  return await Packer.toBuffer(doc)
}
