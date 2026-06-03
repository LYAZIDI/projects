import { callAgent } from './llm'
import type { ProductAnalysis, MarketEvaluation, CustomerAvatar } from './types'

const SYSTEM = `You are a customer psychology expert and brand strategist.
You build hyper-specific customer avatars based on product and market data.
Go deep on psychographics, emotional triggers, and daily behavior patterns.
The avatar must feel like a real person, not a demographic statistic.`

export async function runAvatarBuilder(
  product: ProductAnalysis,
  market: MarketEvaluation
): Promise<CustomerAvatar> {
  const prompt = `Build a detailed customer avatar for this product:

Product: ${product.name}
Main Benefit: ${product.mainBenefit}
Problem Solved: ${product.problemSolved}
Target Demographic: ${product.targetDemographic}
Top Markets: ${market.topMarkets.join(', ')}
Demand Score: ${market.demandScore}/100

Return a JSON object with this exact schema:
{
  "name": "a fictional first name representing this avatar",
  "age": { "min": 25, "max": 45 },
  "gender": "primary gender",
  "location": ["City, Country"],
  "income": "$X,000 - $Y,000/year",
  "occupation": ["job1", "job2"],
  "painPoints": ["pain1", "pain2", "pain3", "pain4"],
  "desires": ["desire1", "desire2", "desire3"],
  "objections": ["why they might not buy 1", "objection2"],
  "buyingTriggers": ["what makes them pull the trigger 1", "trigger2"],
  "socialMedia": ["TikTok", "Instagram"],
  "influencers": ["type of influencer they follow"],
  "values": ["value1", "value2"],
  "dayInLife": "A brief description of their typical day and where this product fits",
  "emotionalDrivers": ["emotion1", "emotion2"]
}`

  return callAgent<CustomerAvatar>(SYSTEM, prompt, 1500)
}
