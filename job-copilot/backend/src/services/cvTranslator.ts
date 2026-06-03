import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export async function translateCV(rawText: string, parsedData: {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: { title: string; company: string; period: string }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
}): Promise<TranslatedCV> {
  const prompt = `You are a professional CV translator and writer. Translate the following CV from its original language to English.

Here is the raw CV text:
<cv_text>
${rawText.slice(0, 4000)}
</cv_text>

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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are a professional CV translator. Always respond with valid JSON only, no markdown or extra text.',
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  let json = content.text.trim()
  // Strip markdown code blocks if present
  json = json.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  const translated: TranslatedCV = JSON.parse(json)
  return translated
}
