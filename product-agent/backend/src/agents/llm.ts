import Anthropic from '@anthropic-ai/sdk'

// Lazy init — ensures dotenv has run before the client is created
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/**
 * Call Claude and parse the JSON response.
 * The system prompt forces structured JSON output.
 */
export async function callAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no code block. Be concise — keep string values under 100 words each.',
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Agent returned invalid JSON: ${text.slice(0, 200)}`)
  }
}
