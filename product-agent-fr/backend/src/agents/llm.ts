import OpenAI from 'openai'

const TEXT_MODEL = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const JSON_INSTRUCTION = '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas d\'explication, pas de bloc de code. Sois concis — chaque valeur textuelle doit faire moins de 80 mots.'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })
  return _client
}

function parseResponse(raw: OpenAI.Chat.Completions.ChatCompletion): string {
  if (!raw.choices || raw.choices.length === 0) {
    throw new Error(`Réponse Groq vide ou invalide : ${JSON.stringify(raw).slice(0, 300)}`)
  }
  return (raw.choices[0].message.content ?? '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
}

export async function appelAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
  const response = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt + JSON_INSTRUCTION },
      { role: 'user', content: userPrompt },
    ],
  })

  const text = parseResponse(response)

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
  maxTokens = 1024
): Promise<T> {
  const response = await getClient().chat.completions.create({
    model: VISION_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide.' },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${imageMimeType};base64,${imageBase64}` },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  })

  const text = parseResponse(response)
  return JSON.parse(text) as T
}
