import { GoogleGenAI } from '@google/genai'

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return _client
}

export interface TranslatedCV {
  name: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: { title: string; company: string; period: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
  detectedSourceLanguage: string
}

export async function translateCV(rawText: string | undefined, parsedData: {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: { title: string; company: string; period: string; description?: string }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
}): Promise<TranslatedCV> {
  const rawSection = rawText
    ? `Here is the raw CV text (use it to enrich bullet points):\n<cv_text>\n${rawText.slice(0, 10000)}\n</cv_text>\n`
    : ''

  const expCount = parsedData.experience.length
  const expJson = JSON.stringify(parsedData.experience, null, 2)

  const systemPrompt = `You are a professional CV translator. Always respond with valid JSON only, no markdown or extra text.`

  const userPrompt = `Translate this CV to professional English. Return ONLY valid JSON, no markdown, no explanation.

${rawSection}

Structured CV data:
- Name: ${parsedData.name}
- Email: ${parsedData.email}
- Phone: ${parsedData.phone}
- Skills: ${parsedData.skills.join(', ')}
- Experience (${expCount} entries — translate ALL ${expCount}):
${expJson}
- Education: ${JSON.stringify(parsedData.education)}
- Languages: ${parsedData.languages.join(', ')}

Instructions:
1. Detect source language
2. Translate ALL content to professional English
3. IMPORTANT: include ALL ${expCount} experience entries in the output — do not skip any
4. For each experience, write 2-3 impactful bullet points (use raw CV text for details if available)
5. Write a 3-4 sentence professional summary
6. Translate skills to standard English equivalents
7. Keep company/school names as-is

JSON structure:
{
  "detectedSourceLanguage": "French",
  "name": "...",
  "email": "...",
  "phone": "...",
  "summary": "...",
  "skills": ["..."],
  "experience": [
    { "title": "...", "company": "...", "period": "...", "bullets": ["...", "...", "..."] }
  ],
  "education": [{ "degree": "...", "school": "...", "year": "..." }],
  "languages": ["..."]
}`

  const response = await getClient().models.generateContent({
    model: 'gemini-flash-latest',
    contents: [{ parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
    },
  })

  let text = (response.text ?? '').trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  const translated: TranslatedCV = JSON.parse(text)
  return translated
}
