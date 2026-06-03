import { randomUUID } from 'crypto'
import type { ProductInput, PipelineResult } from '../agents/types'
import { runProductAnalyzer } from '../agents/productAnalyzer'
import { runMarketEvaluator } from '../agents/marketEvaluator'
import { runAvatarBuilder } from '../agents/avatarBuilder'
import { runStrategyGenerator } from '../agents/strategyGenerator'
import { runPageGenerator } from '../agents/pageGenerator'
import { runAdGenerator } from '../agents/adGenerator'
import { runContentCreator } from '../agents/contentCreator'
import { runScoreEngine } from '../agents/scoreEngine'

export type PipelineStep =
  | 'product' | 'market' | 'avatar' | 'strategy'
  | 'page' | 'ads' | 'content' | 'score' | 'done'

export type ProgressCallback = (step: PipelineStep, progress: number) => void

/**
 * Main orchestrator — runs all 8 agents sequentially.
 * Each agent receives the output of previous ones as context.
 * Progress is reported via callback for SSE streaming.
 */
export async function runPipeline(
  input: ProductInput,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const id = randomUUID()
  const report = (step: PipelineStep, pct: number) => onProgress?.(step, pct)

  report('product', 5)
  const product = await runProductAnalyzer(input)
  report('product', 15)

  const market = await runMarketEvaluator(product)
  report('market', 28)

  const avatar = await runAvatarBuilder(product, market)
  report('avatar', 42)

  const strategy = await runStrategyGenerator(product, market, avatar)
  report('strategy', 55)

  const page = await runPageGenerator(product, avatar, strategy)
  report('page', 67)

  const ads = await runAdGenerator(product, avatar, strategy)
  report('ads', 78)

  const content = await runContentCreator(product, avatar)
  report('content', 90)

  const score = await runScoreEngine(product, market, strategy)
  report('score', 98)

  const result: PipelineResult = {
    id,
    input,
    createdAt: new Date().toISOString(),
    product,
    market,
    avatar,
    strategy,
    page,
    ads,
    content,
    score,
  }

  report('done', 100)
  return result
}
