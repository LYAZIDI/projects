import { callAgent } from './llm'
import type { ProductAnalysis, CustomerAvatar, ContentPlan } from './types'

const SYSTEM = `You are a viral content strategist and TikTok script writer.
You create content that gets shared, saves, and drives sales.
Your scripts are conversational, authentic, and optimized for watch time.
Think like a creator who's also a marketer — entertain first, convert second.`

export async function runContentCreator(
  product: ProductAnalysis,
  avatar: CustomerAvatar
): Promise<ContentPlan> {
  const prompt = `Create a full content plan for:

Product: ${product.name}
Wow Factor: ${product.wowFactor}
Problem Solved: ${product.problemSolved}
Avatar: ${avatar.name}, ${avatar.age.min}-${avatar.age.max}
Avatar Platforms: ${avatar.socialMedia.join(', ')}
Avatar Pain: ${avatar.painPoints.slice(0, 2).join(' / ')}
Emotional Drivers: ${avatar.emotionalDrivers.join(', ')}

Return a JSON object with this exact schema:
{
  "tiktokScripts": [
    {
      "angle": "Problem-Agitate-Solve",
      "hook": "Opening line (makes viewer stop scrolling)",
      "script": "Full 30-60 second script with [actions] in brackets",
      "duration": "30s",
      "cta": "Check link in bio!"
    },
    {
      "angle": "Social Proof / Testimonial",
      "hook": "Hook variation 2",
      "script": "Alternative script",
      "duration": "45s",
      "cta": "Get yours before they sell out!"
    },
    {
      "angle": "Shock / Curiosity",
      "hook": "Third hook variation",
      "script": "Curiosity-driven script",
      "duration": "15s",
      "cta": "Link in bio 👆"
    }
  ],
  "hooks": [
    "Hook 1 — pain-based",
    "Hook 2 — curiosity-based",
    "Hook 3 — result-based",
    "Hook 4 — social proof",
    "Hook 5 — shock/surprise"
  ],
  "angles": [
    "Angle 1: name and brief description",
    "Angle 2: alternative framing",
    "Angle 3: contrarian take",
    "Angle 4: educational"
  ],
  "emailSequence": [
    {
      "subject": "Email subject line",
      "preview": "Preview text",
      "body": "Email body (2-3 paragraphs)",
      "cta": "Shop Now",
      "delay": "Immediately"
    },
    {
      "subject": "Follow-up subject",
      "preview": "Follow-up preview",
      "body": "Follow-up email body",
      "cta": "Get Yours",
      "delay": "Day 2"
    }
  ],
  "contentCalendar": [
    { "day": 1, "platform": "TikTok", "type": "Video", "topic": "Problem hook" },
    { "day": 2, "platform": "Instagram", "type": "Reel", "topic": "Demo" },
    { "day": 3, "platform": "TikTok", "type": "Video", "topic": "Testimonial" },
    { "day": 5, "platform": "TikTok", "type": "Video", "topic": "FAQ" },
    { "day": 7, "platform": "Instagram", "type": "Story", "topic": "Urgency" }
  ]
}`

  return callAgent<ContentPlan>(SYSTEM, prompt, 3000)
}
