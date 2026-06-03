import { callAgent } from './llm'
import type { ProductAnalysis, MarketEvaluation, CustomerAvatar, MarketingStrategy } from './types'

const SYSTEM = `You are a performance marketing strategist with 10+ years in e-commerce and paid ads.
You design complete go-to-market strategies that are profitable from day one.
Be specific with budgets, timelines, and tactics. Think like a media buyer.`

export async function runStrategyGenerator(
  product: ProductAnalysis,
  market: MarketEvaluation,
  avatar: CustomerAvatar
): Promise<MarketingStrategy> {
  const prompt = `Create a complete marketing strategy for:

Product: ${product.name}
USP: ${product.mainBenefit}
Recommended Price: $${product.priceRange.recommended}
Market Demand: ${market.demandScore}/100
Competition: ${market.competitionLevel}
Avatar: ${avatar.name}, ${avatar.age.min}-${avatar.age.max} years old
Pain Points: ${avatar.painPoints.slice(0, 3).join(', ')}
Platforms: ${avatar.socialMedia.join(', ')}
Emotional Drivers: ${avatar.emotionalDrivers.join(', ')}

Return a JSON object with this exact schema:
{
  "positioning": "how to position the product in the market",
  "uniqueSellingProposition": "the one-liner USP",
  "pricingStrategy": "pricing approach and rationale",
  "launchPhases": [
    {
      "phase": "Phase 1 - Testing",
      "duration": "Week 1-2",
      "budget": "$500",
      "objective": "Find winning creatives",
      "actions": ["action1", "action2"]
    }
  ],
  "channels": [
    {
      "channel": "TikTok Ads",
      "priority": "primary",
      "budget_percent": 60,
      "tactics": ["tactic1", "tactic2"]
    }
  ],
  "kpis": [
    { "metric": "ROAS", "target": "2.5x" }
  ],
  "estimatedROAS": "2.5x - 4x after optimization"
}`

  return callAgent<MarketingStrategy>(SYSTEM, prompt, 8192)
}
