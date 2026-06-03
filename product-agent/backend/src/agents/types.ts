// ─── Shared agent I/O types ────────────────────────────────────────────────

export interface ProductInput {
  url?: string
  name: string
  description: string
  price?: number
  images?: string[]
  category?: string
}

// Agent 1 — Product Analyzer
export interface ProductAnalysis {
  name: string
  category: string
  mainBenefit: string
  problemSolved: string
  uniqueFeatures: string[]
  targetDemographic: string
  priceRange: { min: number; max: number; recommended: number }
  competitorKeywords: string[]
  wowFactor: string
  isWinningProduct: boolean
}

// Agent 2 — Market Evaluator
export interface MarketEvaluation {
  demandScore: number           // 0-100
  competitionLevel: 'low' | 'medium' | 'high'
  saturationRisk: 'low' | 'medium' | 'high'
  trendDirection: 'rising' | 'stable' | 'declining'
  estimatedMonthlySearches: number
  topMarkets: string[]
  seasonality: string
  opportunityWindow: string
  marketSizeEstimate: string
  entryBarriers: string[]
  keyInsights: string[]
}

// Agent 3 — Avatar Builder
export interface CustomerAvatar {
  name: string
  age: { min: number; max: number }
  gender: string
  location: string[]
  income: string
  occupation: string[]
  painPoints: string[]
  desires: string[]
  objections: string[]
  buyingTriggers: string[]
  socialMedia: string[]
  influencers: string[]
  values: string[]
  dayInLife: string
  emotionalDrivers: string[]
}

// Agent 4 — Strategy Generator
export interface MarketingStrategy {
  positioning: string
  uniqueSellingProposition: string
  pricingStrategy: string
  launchPhases: Array<{
    phase: string
    duration: string
    budget: string
    objective: string
    actions: string[]
  }>
  channels: Array<{
    channel: string
    priority: 'primary' | 'secondary'
    budget_percent: number
    tactics: string[]
  }>
  kpis: Array<{ metric: string; target: string }>
  estimatedROAS: string
}

// Agent 5 — Page Generator
export interface ProductPage {
  headline: string
  subheadline: string
  heroDescription: string
  bulletPoints: string[]
  socialProof: string[]
  faqs: Array<{ question: string; answer: string }>
  urgencyTriggers: string[]
  ctaText: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  sections: Array<{ title: string; content: string }>
}

// Agent 6 — Ad Generator
export interface AdCampaigns {
  facebook: {
    primary: Array<{
      format: string
      headline: string
      primaryText: string
      description: string
      cta: string
      audience: string
      objective: string
    }>
  }
  tiktok: {
    ads: Array<{
      hook: string
      caption: string
      hashtags: string[]
      soundtrack: string
      duration: string
      format: string
    }>
  }
}

// Agent 7 — Content Creator
export interface ContentPlan {
  tiktokScripts: Array<{
    angle: string
    hook: string
    script: string
    duration: string
    cta: string
  }>
  hooks: string[]
  angles: string[]
  emailSequence: Array<{
    subject: string
    preview: string
    body: string
    cta: string
    delay: string
  }>
  contentCalendar: Array<{
    day: number
    platform: string
    type: string
    topic: string
  }>
}

// Agent 8 — Score Engine
export interface ProductScore {
  globalScore: number           // 0-100
  verdict: 'winner' | 'potential' | 'risky' | 'avoid'
  breakdown: {
    marketDemand: number
    competition: number
    profitMargin: number
    viralPotential: number
    scalability: number
    timing: number
  }
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  estimatedMonthlyRevenue: string
  breakEvenUnits: number
  launchReadiness: string
}

// Full pipeline result
export interface PipelineResult {
  id: string
  input: ProductInput
  createdAt: string
  product: ProductAnalysis
  market: MarketEvaluation
  avatar: CustomerAvatar
  strategy: MarketingStrategy
  page: ProductPage
  ads: AdCampaigns
  content: ContentPlan
  score: ProductScore
}
