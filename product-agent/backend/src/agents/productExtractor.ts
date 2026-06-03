/**
 * Agent 0 — Product Extractor
 * Analyzes a product image (base64) or URL page content
 * and extracts structured product info before the main pipeline runs.
 */
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import path from 'path'
import type { ProductInput } from './types'

dotenv.config({ path: path.join(process.cwd(), '.env') })

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const SYSTEM = `You are an e-commerce product analyst.
Your job is to extract key product information from an image or webpage content.
Always respond with valid JSON only. Be specific and commercial in your descriptions.`

/**
 * Extract product info from a base64-encoded image (any format)
 */
export async function extractFromImage(base64: string, mediaType: string): Promise<ProductInput> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        },
        {
          type: 'text',
          text: `Analyze this product image and extract the following information as JSON:
{
  "name": "product name (be specific and commercial)",
  "description": "2-3 sentences describing the product, its key features, what problem it solves, and who it's for",
  "category": "product category (e.g. Health & Wellness, Beauty, Home & Garden, etc.)",
  "price": estimated retail price as a number in USD (null if unknown)
}`,
        },
      ],
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  return JSON.parse(text) as ProductInput
}

/**
 * Extract product info from a URL by fetching the page HTML
 */
export async function extractFromUrl(url: string): Promise<ProductInput> {
  // Fetch the page
  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
  } catch (err) {
    throw new Error(`Could not fetch URL: ${url}`)
  }

  // Extract meaningful text (strip tags, limit to 3000 chars)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000)

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Extract product information from this webpage content (URL: ${url}):

${text}

Return JSON only:
{
  "name": "product name",
  "description": "2-3 sentences: features, problem solved, target customer",
  "category": "product category",
  "price": price as number in USD or null,
  "url": "${url}"
}`,
    }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  return { ...JSON.parse(raw), url } as ProductInput
}
