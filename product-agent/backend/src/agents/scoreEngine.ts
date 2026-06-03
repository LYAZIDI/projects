import { callAgent } from './llm'
import type { ProductAnalysis, MarketEvaluation, MarketingStrategy, ProductScore } from './types'

const SYSTEM = `You are a veteran e-commerce investor and product analyst who has evaluated 10,000+ dropshipping products.
You give honest, data-driven scores. Be critical. Most products fail — say so if needed.
Your score is used by entrepreneurs to decide whether to invest time and money.`

export async function runScoreEngine(
  product: ProductAnalysis,
  market: MarketEvaluation,
  strategy: MarketingStrategy
): Promise<ProductScore> {
  const prompt = `Score this product for dropshipping success:

Product: ${product.name}
Is Winning Product: ${product.isWinningProduct}
Wow Factor: ${product.wowFactor}
Recommended Price: $${product.priceRange.recommended}
Market Demand Score: ${market.demandScore}/100
Competition Level: ${market.competitionLevel}
Saturation Risk: ${market.saturationRisk}
Trend: ${market.trendDirection}
Estimated Monthly Searches: ${market.estimatedMonthlySearches}
Opportunity Window: ${market.opportunityWindow}
Entry Barriers: ${market.entryBarriers.join(', ')}
Estimated ROAS: ${strategy.estimatedROAS}

Return a JSON object with this exact schema:
{
  "globalScore": 72,
  "verdict": "potential",
  "breakdown": {
    "marketDemand": 80,
    "competition": 65,
    "profitMargin": 70,
    "viralPotential": 85,
    "scalability": 60,
    "timing": 75
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["Do X first", "Avoid Y", "Focus on Z"],
  "estimatedMonthlyRevenue": "$5,000 - $15,000",
  "breakEvenUnits": 47,
  "launchReadiness": "Ready to launch / Needs more research / High risk"
}

Verdict scale: winner (85+) / potential (65-84) / risky (45-64) / avoid (<45)`

  return callAgent<ProductScore>(SYSTEM, prompt, 1024)
}
