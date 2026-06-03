import { callAgent } from './llm'
import type { ProductAnalysis, CustomerAvatar, MarketingStrategy, ProductPage } from './types'

const SYSTEM = `You are an elite e-commerce copywriter and conversion rate optimization expert.
You write Shopify product pages that convert at 4%+. Your copy speaks directly to the customer's pain and desires.
Use proven frameworks: AIDA, PAS, and storytelling. Every word earns its place.`

export async function runPageGenerator(
  product: ProductAnalysis,
  avatar: CustomerAvatar,
  strategy: MarketingStrategy
): Promise<ProductPage> {
  const prompt = `Write a high-converting product page for:

Product: ${product.name}
Main Benefit: ${product.mainBenefit}
Problem Solved: ${product.problemSolved}
Wow Factor: ${product.wowFactor}
Features: ${product.uniqueFeatures.join(', ')}
USP: ${strategy.uniqueSellingProposition}
Avatar Pain: ${avatar.painPoints.slice(0, 2).join(', ')}
Avatar Desire: ${avatar.desires.slice(0, 2).join(', ')}
Objections: ${avatar.objections.join(', ')}
Price: $${product.priceRange.recommended}

Return a JSON object with this exact schema:
{
  "headline": "Main headline (pain or desire focused)",
  "subheadline": "Supporting headline",
  "heroDescription": "2-3 sentence hero section copy",
  "bulletPoints": [
    "✅ Benefit-focused bullet 1",
    "✅ Bullet 2",
    "✅ Bullet 3",
    "✅ Bullet 4",
    "✅ Bullet 5"
  ],
  "socialProof": [
    "★★★★★ Customer review 1",
    "★★★★★ Customer review 2",
    "★★★★★ Customer review 3"
  ],
  "faqs": [
    { "question": "FAQ question 1?", "answer": "Answer addressing objection" }
  ],
  "urgencyTriggers": ["Only X left in stock", "Limited time offer"],
  "ctaText": "Add to Cart - Get Yours Now",
  "seoTitle": "SEO optimized title (60 chars)",
  "seoDescription": "SEO meta description (160 chars)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "sections": [
    { "title": "Section heading", "content": "Section body copy" }
  ]
}`

  return callAgent<ProductPage>(SYSTEM, prompt, 2500)
}
