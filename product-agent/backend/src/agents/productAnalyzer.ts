import { callAgent } from './llm'
import type { ProductInput, ProductAnalysis } from './types'

const SYSTEM = `You are an expert e-commerce product analyst specializing in dropshipping and winning products.
Your role is to deeply analyze a product and extract its key commercial attributes.
Focus on: uniqueness, problem-solution fit, viral potential, and profit margins.`

export async function runProductAnalyzer(input: ProductInput): Promise<ProductAnalysis> {
  const prompt = `Analyze this product for dropshipping potential:

Product Name: ${input.name}
Description: ${input.description}
${input.url ? `URL: ${input.url}` : ''}
${input.price ? `Price: $${input.price}` : ''}
${input.category ? `Category: ${input.category}` : ''}

Return a JSON object with this exact schema:
{
  "name": "clean product name",
  "category": "product category",
  "mainBenefit": "the #1 benefit in one sentence",
  "problemSolved": "what problem does it solve",
  "uniqueFeatures": ["feature1", "feature2", "feature3"],
  "targetDemographic": "who is the primary buyer",
  "priceRange": { "min": 0, "max": 0, "recommended": 0 },
  "competitorKeywords": ["keyword1", "keyword2"],
  "wowFactor": "what makes people stop scrolling",
  "isWinningProduct": true
}`

  return callAgent<ProductAnalysis>(SYSTEM, prompt)
}
