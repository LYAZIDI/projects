import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Upload, Link, X, Search, TrendingUp, Target, Megaphone, FileText, Video, Star, ArrowRight } from 'lucide-react'

type Mode = 'image' | 'url'

const STEPS = [
  { icon: Search,     label: 'Product Analysis' },
  { icon: TrendingUp, label: 'Market Evaluation' },
  { icon: Target,     label: 'Customer Avatar' },
  { icon: Megaphone,  label: 'Marketing Strategy' },
  { icon: FileText,   label: 'Product Page' },
  { icon: Megaphone,  label: 'Ad Campaigns' },
  { icon: Video,      label: 'Content Plan' },
  { icon: Star,       label: 'Success Score' },
]

export default function Home() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>('image')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [dragging, setDragging] = useState(false)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [extracted, setExtracted] = useState<{ name: string; description: string } | null>(null)
  const [error, setError] = useState('')

  const STEP_MAP: Record<string, number> = {
    extracting: -1, product: 0, market: 1, avatar: 2,
    strategy: 3, page: 4, ads: 5, content: 6, score: 7, done: 7,
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setError('')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function handleAnalyze() {
    if (mode === 'image' && !imageFile) { setError('Please upload a product image.'); return }
    if (mode === 'url' && !url.trim()) { setError('Please enter a product URL.'); return }

    setLoading(true); setError(''); setProgress(0); setLabel(''); setExtracted(null)

    try {
      const formData = new FormData()
      if (mode === 'image' && imageFile) {
        formData.append('image', imageFile)
      } else {
        formData.append('url', url.trim())
      }

      const response = await fetch('/api/analyze/stream', { method: 'POST', body: formData })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: any = null
      let lastEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) { lastEvent = line.slice(7).trim(); continue }
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (lastEvent === 'progress' || data.step) {
              setProgress(data.progress ?? 0)
              setLabel(data.label ?? '')
              setCurrentStep(STEP_MAP[data.step] ?? -1)
            }
            if (lastEvent === 'extracted' && data.product) {
              setExtracted({ name: data.product.name, description: data.product.description })
            }
            if (lastEvent === 'complete' && data.result) { finalResult = data.result }
            if (lastEvent === 'error') { setError(data.message || 'Error'); setLoading(false); return }
          } catch { /* ignore */ }
        }
      }

      if (finalResult) {
        sessionStorage.setItem(`analysis_${finalResult.id}`, JSON.stringify(finalResult))
        navigate(`/analysis/${finalResult.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3 border-b border-gray-800/60">
        <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-white text-lg tracking-tight">Product Agent</span>
        <span className="ml-auto text-xs text-gray-600">8 AI Agents · Powered by Claude</span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left panel — input */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          {!loading ? (
            <div className="w-full max-w-lg">
              {/* Hero text */}
              <div className="mb-10 text-center">
                <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                  Analyze Any Product<br />
                  <span className="text-violet-400">in 60 Seconds</span>
                </h1>
                <p className="text-gray-400">
                  Upload a product image or paste its URL.<br />
                  Our 8 AI agents generate a complete dropshipping report.
                </p>
              </div>

              {/* Mode toggle */}
              <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
                {(['image', 'url'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      mode === m ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m === 'image' ? <><Upload size={15} /> Product Image</> : <><Link size={15} /> Product URL</>}
                  </button>
                ))}
              </div>

              {/* Image drop zone */}
              {mode === 'image' && (
                <div
                  className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer mb-6 ${
                    dragging ? 'border-violet-500 bg-violet-950/30' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Product" className="w-full h-72 object-contain rounded-2xl p-4" />
                      <button
                        onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                        className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 rounded-full p-1.5"
                      >
                        <X size={14} className="text-white" />
                      </button>
                      <div className="absolute bottom-3 left-3 bg-gray-900/90 rounded-lg px-3 py-1.5 text-xs text-gray-300">
                        {imageFile?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Upload size={28} className="text-gray-500" />
                      </div>
                      <p className="text-gray-300 font-medium mb-1">Drop your product image here</p>
                      <p className="text-gray-500 text-sm">or click to browse · JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>
              )}

              {/* URL input */}
              {mode === 'url' && (
                <div className="mb-6">
                  <div className="relative">
                    <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="url"
                      value={url}
                      onChange={e => { setUrl(e.target.value); setError('') }}
                      placeholder="https://www.aliexpress.com/item/..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                      onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    />
                  </div>
                  <p className="text-gray-600 text-xs mt-2 pl-1">Works with AliExpress, Amazon, Shopify, Alibaba, Temu…</p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={mode === 'image' ? !imageFile : !url.trim()}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg"
              >
                <Zap size={20} />
                Analyze Product
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            // Loading state
            <div className="w-full max-w-lg text-center">
              <div className="w-20 h-20 bg-violet-900/50 border border-violet-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap size={36} className="text-violet-400 animate-pulse" />
              </div>

              {extracted && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-6 text-left">
                  <p className="text-xs text-violet-400 font-medium mb-1">PRODUCT IDENTIFIED</p>
                  <p className="text-white font-semibold">{extracted.name}</p>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{extracted.description}</p>
                </div>
              )}

              <p className="text-white font-semibold text-xl mb-2">{label || 'Starting…'}</p>
              <p className="text-gray-500 text-sm mb-8">Running 8 AI agents sequentially</p>

              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-violet-600 to-violet-400 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-violet-400 font-bold text-lg mb-8">{progress}%</p>

              {/* Step indicators */}
              <div className="grid grid-cols-4 gap-2">
                {STEPS.map(({ icon: Icon, label: stepLabel }, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-2 text-center transition-all ${
                      i < currentStep ? 'bg-violet-900/60 border border-violet-700' :
                      i === currentStep ? 'bg-violet-600/30 border border-violet-500 scale-105' :
                      'bg-gray-900 border border-gray-800 opacity-40'
                    }`}
                  >
                    <Icon size={14} className={i <= currentStep ? 'text-violet-400 mx-auto mb-1' : 'text-gray-600 mx-auto mb-1'} />
                    <p className="text-[9px] text-gray-400 leading-tight">{stepLabel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — decorative */}
        <div className="hidden lg:flex w-96 flex-col items-center justify-center bg-gray-900/40 border-l border-gray-800/60 px-8 py-16">
          <div className="space-y-3 w-full">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-4">What you'll get</p>
            {[
              { icon: Search,     title: 'Product Analysis',    desc: 'Wow factor, USP, pricing strategy' },
              { icon: TrendingUp, title: 'Market Report',       desc: 'Demand score, competition, trends' },
              { icon: Target,     title: 'Customer Avatar',     desc: 'Deep psychographic profile' },
              { icon: Megaphone,  title: 'Marketing Strategy',  desc: 'Channels, budget, launch phases' },
              { icon: FileText,   title: 'Product Page',        desc: 'Ready-to-use Shopify copy' },
              { icon: Megaphone,  title: 'Ad Creatives',        desc: 'Facebook & TikTok ads' },
              { icon: Video,      title: 'TikTok Scripts',      desc: '3 scripts + 5 hooks + angles' },
              { icon: Star,       title: 'Success Score',       desc: 'Verdict + revenue estimate' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
                <Icon size={16} className="text-violet-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
