import { GoogleGenAI } from '@google/genai'

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return _client
}

export async function callAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  _maxTokens = 2048
): Promise<T> {
  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no code block. Be concise — keep string values under 100 words each.',
    },
  })

  const text = (response.text ?? '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Agent returned invalid JSON: ${text.slice(0, 200)}`)
  }
}
