/**
 * CV DOCX Generator — "Executive Night" template
 * 100% dynamic — all content comes from the CV profile, nothing hardcoded.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  LevelFormat, Footer, TabStopType,
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
const SIDE_W   = Math.round(A4_W * 0.33)
const MAIN_W   = A4_W - SIDE_W

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

/** Extract experiences from raw text — handles "en cours", "présent", year–year */
function extractExpsFromRaw(raw: string): RawExp[] {
  if (!raw) return []
  const results: RawExp[] = []
  const lines = raw.split('\n').map(l => l.trim())
  let inSection = false
  let cur: RawExp | null = null

  // Date: "2023 – 2025", "07/2022 – présent", "09/2019 – 07/2022"
  const dateRx = /\b(?:\d{1,2}[\/\-])?(20\d{2}|19\d{2})\s*[-–—]\s*(?:\d{1,2}[\/\-])?(20\d{2}|19\d{2}|en\s*cours|présent|present|maintenant|aujourd['']hui|current)\b/i

  for (const line of lines) {
    if (!line) continue

    if (!inSection) {
      // Word boundary prevents matching "IntérimExpérience" mid-word
      if (/\bexp.{0,3}rience/i.test(line) && line.length < 70) { inSection = true }
      continue
    }

    // End of section
    if (/^(formation|comp.{0,3}tence|.{0,2}ducation|langues?|profil|centres?|loisirs?|r.{0,3}f.{0,3}rence)/i.test(line) && line.length < 70) break

    const dateMatch = line.match(dateRx)
    if (dateMatch) {
      if (cur?.title) results.push(cur)
      const period = dateMatch[0]
      // Strip everything before and including the date
      const after = line.slice(line.indexOf(period) + period.length)
        .replace(/^\s*[-–—→|•·\s]+/, '').trim()
      // Also strip everything before the date (month names, etc.)
      const before = line.slice(0, line.indexOf(period))
        .replace(/[-–—→|•·\s]+$/, '').trim()

      // "Title – Company (Location)" or "Title | Company"
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
      // Bullet lines
      if (/^[-•▸■–·]/.test(line)) {
        const b = line.replace(/^[-•▸■–·\s]+/, '').trim()
        if (b.length > 2) cur.bullets.push(b)
      } else if (!cur.company && line.length > 2 && line.length < 80 && !/\d{4}/.test(line)) {
        // Possible company name on its own line
        cur.company = line
      }
    }
  }
  if (cur?.title) results.push(cur)
  return results.slice(0, 5)
}

/** Extract profile summary paragraph from rawText */
function extractSummary(raw: string, skills: string[], yearsExp: number): string {
  if (raw) {
    const m = raw.match(/profil\s*(?:professionnel)?\s*\n+([\s\S]{30,500}?)(?:\n\n|\nExp|\nComp|\nFor)/i)
    if (m) return m[1].replace(/\n/g, ' ').trim().slice(0, 400)
  }
  // Generate from data
  const top = (skills || []).slice(0, 3).join(', ')
  const exp = yearsExp > 0 ? `${yearsExp} ans d'expérience` : 'Professionnel expérimenté'
  return `${exp} en ${top || 'son domaine'}. Disponible immédiatement.`
}

/** Extract location from rawText (city, region) */
function extractLocation(raw: string): string {
  if (!raw) return ''
  const m = raw.match(/\b([A-ZÀ-Ü][a-zà-ü-]+(?:-[A-ZÀ-Ü][a-zà-ü-]+)*)\s*[|,]\s*([A-ZÀ-Ü][a-zà-ü-]+(?:-[A-ZÀ-Ü][a-zà-ü-]+)*)/m)
  if (m) return `${m[1]}, ${m[2]}`
  const m2 = raw.match(/\b(Paris|Lyon|Marseille|Bordeaux|Nantes|Lille|Casablanca|Rabat|Agadir|Marrakech|Montréal|Bruxelles)\b/i)
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

function expBlock(exp: RawExp, tabW: number): Paragraph[] {
  const out: Paragraph[] = []

  // Company + period
  out.push(new Paragraph({
    spacing: { before: 160, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: tabW - 80 }],
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: TEAL, space: 8 } },
    indent: { left: 160 },
    children: [
      new TextRun({ text: exp.company || exp.title, bold: true, size: 21, font: 'Montserrat', color: CHARCOAL }),
      new TextRun({ text: '\t' + exp.period, size: 18, font: 'Calibri', color: TEAL, italics: true }),
    ],
  }))

  // Title + location
  const subtitle = [exp.company ? exp.title : '', exp.location].filter(Boolean).join('  ·  ')
  if (subtitle) {
    out.push(new Paragraph({
      spacing: { before: 0, after: 60 },
      border: { left: { style: BorderStyle.SINGLE, size: 16, color: TEAL, space: 8 } },
      indent: { left: 160 },
      children: [new TextRun({ text: subtitle, size: 19, font: 'Calibri', color: SILVER, italics: true })],
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
  const summary = extractSummary(rawText, skills, cv.yearsExperience || 0)
  const licences = extractLicences(rawText)
  const sector: string = cvAny.sector || 'generic'
  const sectorLabel = sector === 'transport' ? 'Transport & VTC'
    : sector === 'tech' ? 'Tech & Dev'
    : sector === 'compta' ? 'Comptabilité'
    : sector === 'commerce' ? 'Commerce'
    : ''

  // Experiences: rawText extraction for bullets, but cv.experience is authoritative for count
  const parsedExps = cv.experience || []
  let exps = extractExpsFromRaw(rawText)
  // If rawText extraction found fewer experiences than the parser, use parser as primary source
  if (exps.length < parsedExps.length) {
    exps = parsedExps.map(e => ({
      period: e.period,
      title: e.title,
      company: e.company,
      location: '',
      bullets: e.description ? e.description.split(' • ').filter(Boolean) : [],
    }))
  }

  // Job title: from first experience, else from sector
  const jobTitle = (exps[0]?.title && exps[0].title.length < 60 ? exps[0].title : '')
    || (sector === 'transport' ? 'Conducteur Professionnel' : skills[0] || '')

  // Languages
  const langs: string[] = (cv.languages || []).length > 0 ? cv.languages : []

  // ── HEADER ───────────────────────────────────────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [SIDE_W, MAIN_W],
    rows: [new TableRow({
      children: [
        // Sidebar portion of header
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
          ],
        }),
        // Main portion of header
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
    })],
  })

  // ── CONTACT STRIP ────────────────────────────────────────────────────────
  const contactItems: string[] = []
  if (cv.phone) contactItems.push('📞 ' + cv.phone)
  if (cv.email) contactItems.push('✉ ' + cv.email)

  const contactStrip = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [SIDE_W, MAIN_W],
    rows: [new TableRow({
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
    })],
  })

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

  // ── TWO-COLUMN TABLE ─────────────────────────────────────────────────────
  const twoCol = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [SIDE_W, MAIN_W],
    rows: [new TableRow({
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
    })],
  })

  // ── DOCUMENT ─────────────────────────────────────────────────────────────
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
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: { top: MAR_V, right: 0, bottom: MAR_V, left: 0 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'JobCopilot  ·  ', size: 15, color: SILVER, font: 'Calibri' }),
              new TextRun({ text: name, size: 15, color: TEAL, font: 'Calibri' }),
              ...(cvAny.atsScore ? [new TextRun({ text: `  ·  Score ATS ${cvAny.atsScore}/100`, size: 15, color: SILVER, font: 'Calibri' })] : []),
            ],
          })],
        }),
      },
      children: [headerTable, contactStrip, twoCol],
    }],
  })

  return await Packer.toBuffer(doc)
}
