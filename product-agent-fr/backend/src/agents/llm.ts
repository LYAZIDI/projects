import { GoogleGenAI } from '@google/genai'

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return _client
}

const JSON_INSTRUCTION = '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas d\'explication, pas de bloc de code. Sois concis — chaque valeur textuelle doit faire moins de 80 mots.'

export async function appelAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  _maxTokens = 2048
): Promise<T> {
  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: userPrompt }] }],
    config: { systemInstruction: systemPrompt + JSON_INSTRUCTION },
  })

  const text = (response.text ?? '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`L'agent a retourné un JSON invalide : ${text.slice(0, 300)}`)
  }
}

export async function appelAgentVision<T>(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  imageMimeType: string,
  _maxTokens = 1024
): Promise<T> {
  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: userPrompt },
        ],
      },
    ],
    config: { systemInstruction: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide.' },
  })

  const text = (response.text ?? '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  return JSON.parse(text) as T
}
