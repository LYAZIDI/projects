import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, TrendingUp, Target, Star, FileText, Megaphone, Video, Search, ArrowLeft, Copy, CheckCircle } from 'lucide-react'
import type { PipelineResult } from '../../backend/src/agents/types'

const VERDICT_CONFIG = {
  winner:    { color: 'text-green-400',  bg: 'bg-green-900/30 border-green-700',  label: '🏆 WINNER' },
  potential: { color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700', label: '⚡ POTENTIAL' },
  risky:     { color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700', label: '⚠️ RISKY' },
  avoid:     { color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700',       label: '❌ AVOID' },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}/100</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full">
        <div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-gray-500 hover:text-violet-400 transition-colors ml-2">
      {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={18} className="text-violet-400" />
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Analysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [tab, setTab] = useState<'overview' | 'page' | 'ads' | 'content'>('overview')

  useEffect(() => {
    const stored = sessionStorage.getItem(`analysis_${id}`)
    if (stored) setResult(JSON.parse(stored))
  }, [id])

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Analysis not found.</p>
          <button onClick={() => navigate('/')} className="text-violet-400 hover:underline">← Back to home</button>
        </div>
      </div>
    )
  }

  const { product, market, avatar, strategy, page, ads, content, score } = result
  const verdict = VERDICT_CONFIG[score.verdict]

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'page',     label: 'Product Page' },
    { id: 'ads',      label: 'Ad Campaigns' },
    { id: 'content',  label: 'Content Plan' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 sticky top-0 bg-gray-950/95 backdrop-blur z-10">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white mr-2">
          <ArrowLeft size={20} />
        </button>
        <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-white">{product.name}</span>
        <div className={`ml-auto px-3 py-1 rounded-full border text-sm font-bold ${verdict.bg} ${verdict.color}`}>
          {verdict.label}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score */}
            <div className="lg:col-span-1">
              <Card title="Success Score" icon={Star}>
                <div className="text-center mb-6">
                  <div className={`text-6xl font-bold mb-1 ${verdict.color}`}>{score.globalScore}</div>
                  <div className="text-gray-400 text-sm">/100</div>
                  <div className={`mt-3 text-lg font-bold ${verdict.color}`}>{verdict.label}</div>
                </div>
                <div className="space-y-3">
                  {Object.entries(score.breakdown).map(([k, v]) => (
                    <ScoreBar key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={v} />
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">
                  <p className="text-sm text-gray-400">Est. Monthly Revenue</p>
                  <p className="text-green-400 font-semibold">{score.estimatedMonthlyRevenue}</p>
                  <p className="text-sm text-gray-400 mt-2">Break-even Units</p>
                  <p className="text-white font-semibold">{score.breakEvenUnits} units</p>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Product Analysis */}
              <Card title="Product Analysis" icon={Search}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Category</p>
                    <p className="text-white">{product.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Wow Factor</p>
                    <p className="text-white">{product.wowFactor}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Problem Solved</p>
                    <p className="text-white">{product.problemSolved}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Recommended Price</p>
                    <p className="text-green-400 font-semibold text-lg">${product.priceRange.recommended}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Unique Features</p>
                  <div className="flex flex-wrap gap-2">
                    {product.uniqueFeatures.map(f => (
                      <span key={f} className="bg-violet-900/40 text-violet-300 text-xs px-2.5 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Market */}
              <Card title="Market Evaluation" icon={TrendingUp}>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-violet-400">{market.demandScore}</p>
                    <p className="text-xs text-gray-400">Demand Score</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white capitalize">{market.competitionLevel}</p>
                    <p className="text-xs text-gray-400">Competition</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white capitalize">{market.trendDirection}</p>
                    <p className="text-xs text-gray-400">Trend</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {market.keyInsights.map(i => (
                    <p key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-violet-400">→</span>{i}</p>
                  ))}
                </div>
              </Card>

              {/* Avatar */}
              <Card title="Customer Avatar" icon={Target}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-violet-700 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {avatar.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{avatar.name}</p>
                    <p className="text-gray-400 text-sm">{avatar.age.min}-{avatar.age.max} · {avatar.gender} · {avatar.income}</p>
                    <p className="text-gray-300 text-sm mt-2 italic">"{avatar.dayInLife}"</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Pain Points</p>
                    {avatar.painPoints.slice(0, 3).map(p => (
                      <p key={p} className="text-sm text-gray-300 flex gap-1.5 mb-1"><span className="text-red-400">•</span>{p}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Desires</p>
                    {avatar.desires.slice(0, 3).map(d => (
                      <p key={d} className="text-sm text-gray-300 flex gap-1.5 mb-1"><span className="text-green-400">•</span>{d}</p>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Strategy highlights */}
              <Card title="Marketing Strategy" icon={Megaphone}>
                <p className="text-gray-300 text-sm mb-4 italic">"{strategy.uniqueSellingProposition}"</p>
                <div className="grid grid-cols-2 gap-3">
                  {strategy.channels.slice(0, 4).map(c => (
                    <div key={c.channel} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm font-medium">{c.channel}</span>
                        <span className="text-violet-400 text-sm font-bold">{c.budget_percent}%</span>
                      </div>
                      <span className={`text-xs ${c.priority === 'primary' ? 'text-green-400' : 'text-gray-400'}`}>
                        {c.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Score recommendations */}
              <Card title="Recommendations" icon={Star}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-green-400 font-medium mb-2">STRENGTHS</p>
                    {score.strengths.map(s => (
                      <p key={s} className="text-sm text-gray-300 flex gap-1.5 mb-1.5"><span className="text-green-400">✓</span>{s}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-red-400 font-medium mb-2">WEAKNESSES</p>
                    {score.weaknesses.map(w => (
                      <p key={w} className="text-sm text-gray-300 flex gap-1.5 mb-1.5"><span className="text-red-400">✗</span>{w}</p>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-violet-400 font-medium mb-2">ACTION PLAN</p>
                  {score.recommendations.map((r, i) => (
                    <p key={i} className="text-sm text-gray-300 flex gap-2 mb-1.5">
                      <span className="text-violet-400 font-bold">{i + 1}.</span>{r}
                    </p>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── PAGE TAB ── */}
        {tab === 'page' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card title="Product Page Copy" icon={FileText}>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">HEADLINE</p>
                    <CopyButton text={page.headline} />
                  </div>
                  <p className="text-2xl font-bold text-white">{page.headline}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">SUBHEADLINE</p>
                    <CopyButton text={page.subheadline} />
                  </div>
                  <p className="text-lg text-gray-300">{page.subheadline}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">HERO COPY</p>
                  <p className="text-gray-300">{page.heroDescription}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">BULLET POINTS</p>
                  {page.bulletPoints.map((b, i) => (
                    <div key={i} className="flex justify-between items-start py-1.5 border-b border-gray-800">
                      <p className="text-gray-300 text-sm">{b}</p>
                      <CopyButton text={b} />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">CTA</p>
                  <div className="bg-violet-600 text-white rounded-lg px-6 py-3 inline-flex items-center gap-2">
                    {page.ctaText}
                    <CopyButton text={page.ctaText} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">SOCIAL PROOF</p>
                  {page.socialProof.map((r, i) => (
                    <p key={i} className="text-gray-300 text-sm mb-1.5">{r}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">FAQ</p>
                  {page.faqs.map((f, i) => (
                    <div key={i} className="mb-3 bg-gray-800 rounded-lg p-3">
                      <p className="text-white text-sm font-medium mb-1">{f.question}</p>
                      <p className="text-gray-400 text-sm">{f.answer}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">SEO</p>
                  <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <p className="text-blue-400 text-sm font-medium">{page.seoTitle}</p>
                    <p className="text-gray-300 text-sm">{page.seoDescription}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {page.seoKeywords.map(k => (
                        <span key={k} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── ADS TAB ── */}
        {tab === 'ads' && (
          <div className="space-y-6">
            <Card title="Facebook Ads" icon={Megaphone}>
              <div className="space-y-6">
                {ads.facebook.primary.map((ad, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-violet-400 text-sm font-medium">{ad.format}</span>
                      <span className="text-gray-500 text-xs">{ad.objective}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Primary Text</p>
                      <p className="text-gray-300 text-sm">{ad.primaryText}</p>
                      <CopyButton text={ad.primaryText} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Headline</p>
                      <p className="text-white font-semibold">{ad.headline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Audience</p>
                      <p className="text-gray-400 text-sm">{ad.audience}</p>
                    </div>
                    <div className="bg-violet-700 text-white text-sm rounded-lg px-4 py-2 inline-block">{ad.cta}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="TikTok Ads" icon={Video}>
              <div className="space-y-4">
                {ads.tiktok.ads.map((ad, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-violet-400 text-sm font-medium">{ad.format}</span>
                      <span className="text-gray-500 text-xs">{ad.duration}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">🎣 Hook</p>
                      <p className="text-white font-semibold">{ad.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Caption</p>
                      <p className="text-gray-300 text-sm">{ad.caption}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ad.hashtags.map(h => (
                        <span key={h} className="text-blue-400 text-xs">{h}</span>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs">🎵 {ad.soundtrack}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── CONTENT TAB ── */}
        {tab === 'content' && (
          <div className="space-y-6">
            <Card title="TikTok Scripts" icon={Video}>
              {content.tiktokScripts.map((s, i) => (
                <div key={i} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-violet-400 text-sm font-medium">{s.angle}</span>
                    <span className="text-gray-500 text-xs">{s.duration}</span>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">🎣 HOOK</p>
                    <p className="text-white font-semibold mb-3">{s.hook}</p>
                    <p className="text-xs text-gray-500 mb-1">SCRIPT</p>
                    <p className="text-gray-300 text-sm whitespace-pre-line">{s.script}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                      <p className="text-violet-400 text-sm">CTA: {s.cta}</p>
                      <CopyButton text={`HOOK: ${s.hook}\n\n${s.script}\n\nCTA: ${s.cta}`} />
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Hooks & Angles" icon={Zap}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-3">HOOKS (5 variations)</p>
                  <div className="space-y-2">
                    {content.hooks.map((h, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 flex justify-between items-start gap-2">
                        <p className="text-gray-300 text-sm">{h}</p>
                        <CopyButton text={h} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-3">ANGLES</p>
                  <div className="space-y-2">
                    {content.angles.map((a, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-300 text-sm">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Content Calendar (7 days)" icon={FileText}>
              <div className="space-y-2">
                {content.contentCalendar.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-3">
                    <span className="text-violet-400 font-bold w-12">Day {c.day}</span>
                    <span className="text-gray-400 text-sm w-24">{c.platform}</span>
                    <span className="text-gray-500 text-xs w-16">{c.type}</span>
                    <span className="text-white text-sm">{c.topic}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Email Sequence" icon={Megaphone}>
              {content.emailSequence.map((email, i) => (
                <div key={i} className="mb-4 last:mb-0 bg-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-white font-semibold text-sm">{email.subject}</p>
                    <span className="text-gray-500 text-xs">{email.delay}</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">Preview: {email.preview}</p>
                  <p className="text-gray-300 text-sm">{email.body}</p>
                  <div className="mt-2 text-violet-400 text-sm">CTA: {email.cta}</div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
