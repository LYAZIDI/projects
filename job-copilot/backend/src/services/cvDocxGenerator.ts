/**
 * CV DOCX Generator
 * Template: "Executive Professional" — navy sidebar + rust accents
 * Inspired by top transport/logistics CV templates (Novoresume / Kickresume)
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  LevelFormat, Footer, TabStopType,
} from 'docx'
import type { UserProfile } from './profileService'

// ─── Color palette ────────────────────────────────────────────────────────────
//   Navy sidebar: #1A2E4A  |  Rust accent: #B5451B  |  Sidebar text: white
//   Main text: #1C2B39     |  Secondary: #6B7280     |  Sidebar BG: #1A2E4A
//   Divider: #C8D6E5       |  White: #FFFFFF

const NAVY       = '1A2E4A'   // sidebar background, section headings
const RUST       = 'B5451B'   // dates, accent underlines
const SIDEBAR_TXT = 'FFFFFF'  // sidebar text color
const TEXT_DARK  = '1C2B39'   // main body headings
const TEXT_MID   = '6B7280'   // secondary text
const DIVIDER    = 'C8D6E5'   // section underlines in sidebar
const WHITE      = 'FFFFFF'
const LIGHT_RUST = 'F9EDE8'   // very light rust tint for contact bar

// ─── Page geometry (DXA — 1440 DXA = 1 inch) ─────────────────────────────────
const A4_W       = 11906
const A4_H       = 16838
const MARGIN_H   = 720    // 0.5 inch horizontal
const MARGIN_V   = 800    // ~0.56 inch vertical
const CONTENT_W  = A4_W - MARGIN_H * 2   // 10466 DXA

const COL_SIDE   = Math.round(CONTENT_W * 0.31)   // ~3244 DXA sidebar
const COL_MAIN   = CONTENT_W - COL_SIDE             // ~7222 DXA main

// ─── Raw text experience fallback ─────────────────────────────────────────────
// Used when the parser fails to extract experience (encoding corruption)

interface RawExp {
  period: string
  title: string
  company: string
  location: string
  bullets: string[]
}

function parseExperienceFromRawText(rawText: string): RawExp[] {
  if (!rawText) return []
  const results: RawExp[] = []

  // Find experience section start with flexible match for garbled é
  const lines = rawText.split('\n').map(l => l.trim())
  let inSection = false
  let current: RawExp | null = null

  // Matches "2018 – 2026" or "2018 - 2026" (includes garbled dash variants)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Detect section start
    if (!inSection) {
      if (/exp.{0,3}rience/i.test(line) && line.length < 60) {
        inSection = true
      }
      continue
    }

    // Detect end of section (next major section)
    if (line.length < 60 && /^(formation|comp.{0,3}tence|.{0,3}ducation|langues?|profil|r.{0,3}f.{0,3}rence|int.{0,3}r.{0,2}t|loisir)/i.test(line)) {
      break
    }

    // New experience entry: line with year range
    const dateMatch = line.match(/\b(20\d{2}|19\d{2})\s*[^\d\w]{1,4}(20\d{2}|19\d{2})\b/)
    if (dateMatch) {
      if (current) results.push(current)
      const period = `${dateMatch[1]} – ${dateMatch[2]}`

      // Rest of line after date (e.g. "→ Chauffeur VTC – SASU A.C.A.G (Paris)")
      const rest = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length)
        .replace(/^\s*[^\w(À-ÿ]+/, '')  // strip leading arrow/dash chars
        .trim()

      // Split "Titre – Entreprise (Lieu)" or "Titre – Entreprise, Lieu"
      const parts = rest.split(/\s*[-–—]\s*/)
      const title = parts[0]?.replace(/[•▸→]+/, '').trim() || ''
      const companyRaw = parts.slice(1).join(' – ').trim()

      // Extract location from parentheses
      const locMatch = companyRaw.match(/\(([^)]+)\)/)
      const company = companyRaw.replace(/\s*\([^)]+\)/, '').trim()
      const location = locMatch ? locMatch[1] : ''

      current = { period, title, company, location, bullets: [] }
      continue
    }

    // Bullet point under current experience
    if (current && /^[-•▸–\u2013\u2022]/.test(line)) {
      const cleaned = line.replace(/^[-•▸–\u2013\u2022\s]+/, '').trim()
      if (cleaned.length > 2) current.bullets.push(cleaned)
    }
  }

  if (current && current.title) results.push(current)
  return results.slice(0, 5)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

function sidebarSection(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 4 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 19,
        color: SIDEBAR_TXT,
        font: 'Calibri',
        characterSpacing: 50,
      }),
    ],
  })
}

function sidebarItem(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 19,
        font: 'Calibri',
        color: bold ? SIDEBAR_TXT : 'C8D6E5',
        bold,
      }),
    ],
  })
}

function mainSection(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RUST, space: 4 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 20,
        color: NAVY,
        font: 'Calibri',
        characterSpacing: 50,
      }),
    ],
  })
}

function expTitle(title: string, period: string, tabWidth: number): Paragraph {
  return new Paragraph({
    spacing: { before: 180, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: tabWidth - 100 }],
    children: [
      new TextRun({ text: title, bold: true, size: 21, font: 'Calibri', color: TEXT_DARK }),
      new TextRun({ text: '\t' + period, size: 18, font: 'Calibri', color: RUST, italics: true }),
    ],
  })
}

function expCompany(company: string, location: string): Paragraph {
  const parts = [company, location].filter(Boolean).join('  ·  ')
  return new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [
      new TextRun({ text: parts, size: 19, font: 'Calibri', color: TEXT_MID, italics: true }),
    ],
  })
}

function expBullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 240, hanging: 160 },
    children: [
      new TextRun({ text: '▸  ' + text, size: 19, font: 'Calibri', color: TEXT_MID }),
    ],
  })
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateCVDocx(profile: UserProfile): Promise<Buffer> {
  const cv = profile.cv
  const name = cv.name || 'Candidat'

  // Use parsed experience, fall back to rawText extraction if empty
  let experiences: RawExp[] = (cv.experience || []).map(e => ({
    period: e.period,
    title: e.title,
    company: e.company,
    location: '',
    bullets: e.description ? e.description.split(' • ').filter(Boolean) : [],
  }))

  if (experiences.length === 0 && cv.rawText) {
    experiences = parseExperienceFromRawText(cv.rawText)
  }

  // Detect job title from first experience or skills
  const jobTitle = experiences[0]?.title
    || (cv.skills?.some(s => /chauffeur|vtc|livreur/i.test(s)) ? 'Chauffeur VTC / Livreur' : '')

  // ── 1. HEADER BANNER ──────────────────────────────────────────────────────
  // Full-width navy banner with name in Georgia Bold + job title
  const headerBanner = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            margins: { top: 400, bottom: 380, left: 560, right: 400 },
            borders: noBorders,
            width: { size: CONTENT_W, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({
                    text: name.toUpperCase(),
                    bold: true,
                    size: 60,            // 30pt
                    color: WHITE,
                    font: 'Georgia',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: jobTitle,
                    size: 24,            // 12pt
                    color: 'C8D6E5',
                    font: 'Calibri',
                    characterSpacing: 80,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  // ── 2. CONTACT BAR ────────────────────────────────────────────────────────
  // Thin rust-tinted strip with phone | email | location
  const contactParts: string[] = []
  if (cv.phone) contactParts.push('📞  ' + cv.phone)
  if (cv.email) contactParts.push('✉  ' + cv.email)

  const contactBar = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: LIGHT_RUST, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 560, right: 400 },
            borders: {
              ...noBorders,
              left: { style: BorderStyle.SINGLE, size: 20, color: RUST, space: 0 },
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: contactParts.map((part, i) =>
                  new TextRun({
                    text: i === 0 ? part : '    |    ' + part,
                    size: 19,
                    font: 'Calibri',
                    color: NAVY,
                  })
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  })

  // ── 3. SIDEBAR (left) ─────────────────────────────────────────────────────
  const sideChildren: Paragraph[] = []

  // Contact details (stacked in sidebar)
  sideChildren.push(sidebarSection('Contact'))
  if (cv.phone)  sideChildren.push(sidebarItem(cv.phone, true))
  if (cv.email)  sideChildren.push(sidebarItem(cv.email))

  // Skills
  if (cv.skills?.length > 0) {
    sideChildren.push(sidebarSection('Compétences'))
    for (const skill of cv.skills.slice(0, 16)) {
      sideChildren.push(
        new Paragraph({
          spacing: { before: 55, after: 55 },
          children: [
            new TextRun({ text: '▸  ', size: 18, color: RUST, font: 'Calibri' }),
            new TextRun({ text: skill, size: 19, color: SIDEBAR_TXT, font: 'Calibri' }),
          ],
        })
      )
    }
  }

  // Education
  if (cv.education?.length > 0) {
    sideChildren.push(sidebarSection('Formation'))
    for (const edu of cv.education) {
      sideChildren.push(new Paragraph({
        spacing: { before: 90, after: 20 },
        children: [
          new TextRun({ text: edu.degree, bold: true, size: 19, color: SIDEBAR_TXT, font: 'Calibri' }),
        ],
      }))
      if (edu.year) {
        sideChildren.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({ text: edu.year, size: 17, color: 'C8D6E5', font: 'Calibri', italics: true }),
          ],
        }))
      }
    }
  }

  // Languages
  if (cv.languages?.length > 0) {
    sideChildren.push(sidebarSection('Langues'))
    for (const lang of cv.languages) {
      sideChildren.push(sidebarItem('▸  ' + lang))
    }
  }

  // ATS Score
  const cvSector = (cv as any).sector as string | undefined
  if (cv.atsScore) {
    sideChildren.push(sidebarSection('Score ATS'))
    sideChildren.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({ text: `${cv.atsScore}`, bold: true, size: 48, color: RUST, font: 'Georgia' }),
        new TextRun({ text: '/100', size: 22, color: 'C8D6E5', font: 'Calibri' }),
      ],
    }))
    if (cvSector && cvSector !== 'generic') {
      sideChildren.push(sidebarItem(
        cvSector === 'transport' ? 'Secteur Transport & Logistique' : cvSector
      ))
    }
  }

  // ── 4. MAIN CONTENT (right) ───────────────────────────────────────────────
  const mainChildren: Paragraph[] = []

  // Professional Profile (from rawText "Profil professionnel" section or generated)
  let profileSummary = ''
  if (cv.rawText) {
    const profileMatch = cv.rawText.match(/profil\s+professionnel\s*\n+([^\n]{30,300})/i)
    if (profileMatch) profileSummary = profileMatch[1].trim()
  }
  if (!profileSummary && cv.skills?.length > 0) {
    const topSkills = cv.skills.slice(0, 4).join(', ')
    profileSummary = `Professionnel expérimenté, compétences en ${topSkills}. Disponible immédiatement.`
  }

  if (profileSummary) {
    mainChildren.push(mainSection('Profil professionnel'))
    mainChildren.push(new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({ text: profileSummary, size: 20, font: 'Calibri', color: TEXT_MID, italics: true }),
      ],
    }))
  }

  // Work Experience
  mainChildren.push(mainSection('Expérience professionnelle'))

  if (experiences.length === 0) {
    mainChildren.push(new Paragraph({
      spacing: { before: 100 },
      children: [new TextRun({ text: 'Voir CV original pour détails.', size: 19, font: 'Calibri', color: TEXT_MID })],
    }))
  } else {
    for (const exp of experiences) {
      mainChildren.push(expTitle(exp.title, exp.period, COL_MAIN))
      if (exp.company || exp.location) {
        mainChildren.push(expCompany(exp.company, exp.location))
      }
      for (const b of exp.bullets.slice(0, 5)) {
        mainChildren.push(expBullet(b))
      }
    }
  }

  // Interests (from rawText)
  if (cv.rawText) {
    const interestMatch = cv.rawText.match(/(?:centres?.{0,3}d.int.{0,3}r.{0,2}t|loisirs?)\s*\n+([\s\S]{10,200}?)(?:\n\n|\n[A-Z])/i)
    if (interestMatch) {
      const interestLines = interestMatch[1]
        .split('\n')
        .map(l => l.replace(/^[-•▸→\s]+/, '').trim())
        .filter(l => l.length > 2 && l.length < 50)
        .slice(0, 4)

      if (interestLines.length > 0) {
        mainChildren.push(mainSection('Centres d\'intérêt'))
        mainChildren.push(new Paragraph({
          spacing: { before: 100, after: 60 },
          children: interestLines.map((item, i) =>
            new TextRun({
              text: i === 0 ? item : '   ·   ' + item,
              size: 19, font: 'Calibri', color: TEXT_MID,
            })
          ),
        }))
      }
    }
  }

  // ── 5. TWO-COLUMN TABLE ───────────────────────────────────────────────────
  const twoCol = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL_SIDE, COL_MAIN],
    rows: [
      new TableRow({
        children: [
          // Sidebar: navy background
          new TableCell({
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            borders: noBorders,
            width: { size: COL_SIDE, type: WidthType.DXA },
            margins: { top: 200, bottom: 400, left: 300, right: 300 },
            verticalAlign: VerticalAlign.TOP,
            children: sideChildren,
          }),
          // Main: white background
          new TableCell({
            borders: noBorders,
            width: { size: COL_MAIN, type: WidthType.DXA },
            margins: { top: 200, bottom: 400, left: 420, right: 200 },
            verticalAlign: VerticalAlign.TOP,
            children: mainChildren,
          }),
        ],
      }),
    ],
  })

  // ── 6. DOCUMENT ───────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '▸',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } },
        }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: TEXT_DARK } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: { top: MARGIN_V, right: MARGIN_H, bottom: MARGIN_V, left: MARGIN_H },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Généré par JobCopilot  ·  ', size: 16, color: '9CA3AF', font: 'Calibri' }),
                new TextRun({ text: name, size: 16, color: RUST, font: 'Calibri' }),
              ],
            }),
          ],
        }),
      },
      children: [
        headerBanner,
        contactBar,
        twoCol,
      ],
    }],
  })

  return await Packer.toBuffer(doc)
}
