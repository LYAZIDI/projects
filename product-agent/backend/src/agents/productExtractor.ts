import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import path from 'path'
import { callAgent } from './llm'
import type { ProductInput } from './types'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const SYSTEM = `You are an e-commerce product analyst.
Your job is to extract key product information from an image or webpage content.
Always respond with valid JSON only. Be specific and commercial in your descriptions.`

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  return _client
}

/**
 * Extract product info from a base64-encoded image using Gemini Flash (vision)
 */
export async function extractFromImage(base64: string, mediaType: string): Promise<ProductInput> {
  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: mediaType, data: base64 } },
          {
            text: `Analyze this product image and extract the following information as JSON. Respond ONLY with valid JSON, no markdown:\n{\n  "name": "product name (be specific and commercial)",\n  "description": "2-3 sentences describing the product, its key features, what problem it solves, and who it's for",\n  "category": "product category (e.g. Health & Wellness, Beauty, Home & Garden, etc.)",\n  "price": estimated retail price as a number in USD (null if unknown)\n}`,
          },
        ],
      },
    ],
    config: { systemInstruction: SYSTEM },
  })

  const text = (response.text ?? '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  return JSON.parse(text) as ProductInput
}

/**
 * Extract product info from a URL by fetching the page HTML — uses Gemini Flash (text)
 */
export async function extractFromUrl(url: string): Promise<ProductInput> {
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
  } catch {
    throw new Error(`Could not fetch URL: ${url}`)
  }

  const pageText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000)

  const result = await callAgent<Partial<ProductInput>>(
    SYSTEM,
    `Extract product information from this webpage content (URL: ${url}):\n\n${pageText}\n\nReturn JSON only:\n{\n  "name": "product name",\n  "description": "2-3 sentences: features, problem solved, target customer",\n  "category": "product category",\n  "price": price as number in USD or null,\n  "url": "${url}"\n}`,
    1024
  )

  return { ...result, url } as ProductInput
}
