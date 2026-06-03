import pool from '../db/pgClient'
import type { ParsedCV } from '../types'

export interface UserProfile {
  cv: ParsedCV
  savedAt: string
  skillsLower: string[]
  keyTerms: string[]
}

function buildKeyTerms(cv: ParsedCV): string[] {
  return [
    ...cv.skills,
    ...cv.experience.map(e => e.title).filter(Boolean),
    ...cv.experience.map(e => e.company).filter(Boolean),
  ]
    .map(t => t.toLowerCase())
    .filter((t, i, arr) => t.length > 2 && arr.indexOf(t) === i)
}

export async function saveProfile(cv: ParsedCV): Promise<UserProfile> {
  const skillsLower = cv.skills.map(s => s.toLowerCase())
  const keyTerms = buildKeyTerms(cv)

  // Always upsert into row id=1 (single-user app)
  await pool.query(
    `INSERT INTO profiles
       (id, name, email, phone, raw_text, skills, experience, education, languages,
        ats_score, ats_found, ats_missing, years_exp, sector, skills_lower, key_terms, saved_at)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
     ON CONFLICT (id) DO UPDATE SET
       name=$1, email=$2, phone=$3, raw_text=$4, skills=$5, experience=$6,
       education=$7, languages=$8, ats_score=$9, ats_found=$10, ats_missing=$11,
       years_exp=$12, sector=$13, skills_lower=$14, key_terms=$15, saved_at=NOW()`,
    [
      cv.name, cv.email, cv.phone, cv.rawText,
      JSON.stringify(cv.skills), JSON.stringify(cv.experience),
      JSON.stringify(cv.education), JSON.stringify(cv.languages),
      cv.atsScore, JSON.stringify(cv.atsKeywordsFound), JSON.stringify(cv.atsMissing),
      cv.yearsExperience, (cv as any).sector ?? null,
      JSON.stringify(skillsLower), JSON.stringify(keyTerms),
    ]
  )

  console.log(`[Profile] Saved: ${cv.name} — ${cv.skills.length} skills`)
  return { cv, savedAt: new Date().toISOString(), skillsLower, keyTerms }
}

export async function loadProfile(): Promise<UserProfile | null> {
  const { rows } = await pool.query(
    `SELECT * FROM profiles ORDER BY saved_at DESC LIMIT 1`
  )
  if (!rows.length) return null
  const r = rows[0]
  const cv: ParsedCV = {
    rawText:          r.raw_text ?? '',
    name:             r.name ?? '',
    email:            r.email ?? '',
    phone:            r.phone ?? '',
    skills:           r.skills ?? [],
    experience:       r.experience ?? [],
    education:        r.education ?? [],
    languages:        r.languages ?? [],
    atsScore:         r.ats_score ?? 0,
    atsKeywordsFound: r.ats_found ?? [],
    atsMissing:       r.ats_missing ?? [],
    yearsExperience:  r.years_exp ?? 0,
  };
  (cv as any).sector = r.sector
  return {
    cv,
    savedAt:     r.saved_at,
    skillsLower: r.skills_lower ?? [],
    keyTerms:    r.key_terms ?? [],
  }
}

export async function hasProfile(): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM profiles LIMIT 1`)
  return rows.length > 0
}
