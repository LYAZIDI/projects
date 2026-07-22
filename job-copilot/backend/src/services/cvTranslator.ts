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
  experience: { title: string; company: string; period: string }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
}): Promise<TranslatedCV> {
  const rawSection = rawText
    ? `Here is the raw CV text:\n<cv_text>\n${rawText.slice(0, 4000)}\n</cv_text>\n`
    : ''

  const systemPrompt = `You are a professional CV translator. Always respond with valid JSON only, no markdown or extra text.`

  const userPrompt = `You are a professional CV translator and writer. Translate the following CV from its original language to English.

${rawSection}

Here is the structured data already extracted from the CV:
- Name: ${parsedData.name}
- Email: ${parsedData.email}
- Phone: ${parsedData.phone}
- Skills: ${parsedData.skills.join(', ')}
- Experience: ${JSON.stringify(parsedData.experience)}
- Education: ${JSON.stringify(parsedData.education)}
- Languages: ${parsedData.languages.join(', ')}

Your task:
1. Detect the source language of the CV
2. Translate ALL content to professional English
3. For each experience entry, extract or generate 2-3 impactful bullet points describing responsibilities and achievements
4. Write a compelling professional summary (3-4 sentences) in English based on the CV content
5. Translate skill names to their standard English equivalents (e.g. "Gestion de projet" → "Project Management")
6. Keep proper nouns (company names, school names, certifications) as-is unless they have a standard English equivalent

Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "detectedSourceLanguage": "French",
  "name": "...",
  "email": "...",
  "phone": "...",
  "summary": "...",
  "skills": ["...", "..."],
  "experience": [
    {
      "title": "...",
      "company": "...",
      "period": "...",
      "bullets": ["...", "...", "..."]
    }
  ],
  "education": [
    {
      "degree": "...",
      "school": "...",
      "year": "..."
    }
  ],
  "languages": ["...", "..."]
}`

  const response = await getClient().models.generateContent({
    model: 'gemini-1.5-flash',
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
