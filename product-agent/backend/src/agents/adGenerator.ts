import { callAgent } from './llm'
import type { ProductAnalysis, CustomerAvatar, MarketingStrategy, AdCampaigns } from './types'

const SYSTEM = `You are a $10M/year media buyer and creative strategist for Facebook and TikTok ads.
You know what hooks stop the scroll and what copy closes the sale.
Your ads speak the language of the customer, not the brand. Pattern interrupt first, sell second.`

export async function runAdGenerator(
  product: ProductAnalysis,
  avatar: CustomerAvatar,
  strategy: MarketingStrategy
): Promise<AdCampaigns> {
  const prompt = `Create ad campaigns for:

Product: ${product.name}
Wow Factor: ${product.wowFactor}
Price: $${product.priceRange.recommended}
USP: ${strategy.uniqueSellingProposition}
Avatar Pain: ${avatar.painPoints.slice(0, 3).join(' / ')}
Avatar Triggers: ${avatar.buyingTriggers.join(' / ')}
Emotional Drivers: ${avatar.emotionalDrivers.join(', ')}
Platforms: ${avatar.socialMedia.join(', ')}

Return a JSON object with this exact schema:
{
  "facebook": {
    "primary": [
      {
        "format": "Single Image / Video",
        "headline": "Attention-grabbing headline",
        "primaryText": "Full ad copy text (3-5 sentences, pain-aware)",
        "description": "Short description below headline",
        "cta": "Shop Now",
        "audience": "Detailed targeting description",
        "objective": "Conversions / Traffic / Awareness"
      },
      {
        "format": "Carousel",
        "headline": "Carousel ad headline",
        "primaryText": "Carousel primary text",
        "description": "Carousel description",
        "cta": "Learn More",
        "audience": "Retargeting audience",
        "objective": "Conversions"
      }
    ]
  },
  "tiktok": {
    "ads": [
      {
        "hook": "First 3 seconds hook text",
        "caption": "Full TikTok caption with emojis",
        "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
        "soundtrack": "Type of music/sound that works",
        "duration": "15s / 30s / 60s",
        "format": "UGC / Demo / Testimonial / Problem-Solution"
      },
      {
        "hook": "Second hook variation",
        "caption": "Alternative caption",
        "hashtags": ["#hashtag1", "#hashtag2"],
        "soundtrack": "Trending audio style",
        "duration": "30s",
        "format": "Before/After"
      }
    ]
  }
}`

  return callAgent<AdCampaigns>(SYSTEM, prompt, 2500)
}
