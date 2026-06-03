import { callAgent } from './llm'
import type { ProductAnalysis, MarketEvaluation } from './types'

const SYSTEM = `You are a market research expert specializing in e-commerce trends, competitive analysis, and demand forecasting.
Analyze market conditions with data-driven insights. Be realistic and specific.`

export async function runMarketEvaluator(product: ProductAnalysis): Promise<MarketEvaluation> {
  const prompt = `Evaluate the market potential for this product:

Product: ${product.name}
Category: ${product.category}
Main Benefit: ${product.mainBenefit}
Problem Solved: ${product.problemSolved}
Unique Features: ${product.uniqueFeatures.join(', ')}
Target: ${product.targetDemographic}
Keywords: ${product.competitorKeywords.join(', ')}

Return a JSON object with this exact schema:
{
  "demandScore": 75,
  "competitionLevel": "medium",
  "saturationRisk": "low",
  "trendDirection": "rising",
  "estimatedMonthlySearches": 50000,
  "topMarkets": ["US", "UK", "Canada"],
  "seasonality": "year-round or seasonal description",
  "opportunityWindow": "how long the opportunity lasts",
  "marketSizeEstimate": "$X billion",
  "entryBarriers": ["barrier1", "barrier2"],
  "keyInsights": ["insight1", "insight2", "insight3"]
}`

  return callAgent<MarketEvaluation>(SYSTEM, prompt, 1024)
}
