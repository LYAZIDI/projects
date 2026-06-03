import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export async function appelAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas d\'explication, pas de bloc de code. Sois concis — chaque valeur textuelle doit faire moins de 80 mots.',
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`L'agent a retourné un JSON invalide : ${text.slice(0, 300)}`)
  }
}

/** Variante avec image (Claude Vision) */
export async function appelAgentVision<T>(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  imageMimeType: string,
  maxTokens = 1024
): Promise<T> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt + '\n\nIMPORTANT : Réponds UNIQUEMENT avec du JSON valide.',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        { type: 'text', text: userPrompt },
      ],
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  return JSON.parse(text) as T
}
