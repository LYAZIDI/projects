import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useCV } from '../context/CVContext'
import {
  Target, Zap, CheckCircle, AlertTriangle, ArrowRight,
  Copy, ChevronDown, ChevronUp, ArrowLeft, Loader
} from 'lucide-react'

const API = ''

interface ATSSuggestion {
  type: string
  priority: 'high' | 'medium' | 'low'
  message: string
  example?: string
}

interface ATSAnalysis {
  jobTitle: string
  score: number
  keywordsFound: string[]
  keywordsMissing: string[]
  suggestions: ATSSuggestion[]
  rewrittenSummary?: string
}

const PRIORITY_CONFIG = {
  high:   { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Priorité haute' },
  medium: { color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Priorité moyenne' },
  low:    { color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Priorité basse' },
}

export default function ATSOptimizer() {
  const { cv } = useCV()
  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedSugg, setExpandedSugg] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  async function analyze() {
    if (!cv) { setError('Chargez votre CV depuis la page d\'accueil d\'abord.'); return }
    if (!jobTitle.trim() || !jobDesc.trim()) { setError('Renseignez le titre et la description du poste.'); return }

    setError('')
    setLoading(true)
    setAnalysis(null)

    try {
      const res = await fetch(`${API}/api/ats/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, jobTitle, jobDescription: jobDesc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse.')
    } finally {
      setLoading(false)
    }
  }

  function copySummary() {
    if (!analysis?.rewrittenSummary) return
    navigator.clipboard.writeText(analysis.rewrittenSummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scoreColor = analysis
    ? analysis.score >= 70 ? 'text-green-600' : analysis.score >= 50 ? 'text-amber-500' : 'text-red-500'
    : 'text-gray-400'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target size={20} className="text-primary" /> ATS Optimizer
            </h1>
            <p className="text-sm text-gray-500">Analysez votre CV face à une offre et obtenez un score + suggestions concrètes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left — Input */}
          <div className="space-y-4">
            {/* CV status */}
            {cv ? (
              <div className="card p-4 flex items-center gap-3 border-green-200 bg-green-50">
                <CheckCircle size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">{cv.name}</p>
                  <p className="text-xs text-green-700">{cv.skills.length} compétences • Score ATS actuel : {cv.atsScore}/100</p>
                </div>
              </div>
            ) : (
              <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Aucun CV chargé</p>
                </div>
                <Link to="/onboarding" className="btn-primary text-xs">Charger</Link>
              </div>
            )}

            {/* Job title */}
            <div className="card p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Titre du poste</label>
                <input
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="Ex: Chauffeur VTC, Développeur React Senior…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Description de l'offre
                  <span className="text-gray-400 font-normal ml-2">— collez le texte complet</span>
                </label>
                <textarea
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                  rows={10}
                  placeholder="Collez ici la description complète du poste (compétences requises, missions, etc.)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{jobDesc.length} caractères</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {error}
                </p>
              )}

              <button
                onClick={analyze}
                disabled={loading || !cv}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <><Loader size={16} className="animate-spin" /> Analyse en cours…</> : <><Zap size={16} /> Analyser mon CV</>}
              </button>
            </div>
          </div>

          {/* Right — Results */}
          <div className="space-y-4">
            {!analysis && !loading && (
              <div className="card p-8 text-center text-gray-400">
                <Target size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Résultats de l'analyse</p>
                <p className="text-sm mt-1">Renseignez une offre d'emploi et lancez l'analyse</p>
              </div>
            )}

            {analysis && (
              <>
                {/* Score */}
                <div className="card p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Score ATS pour ce poste</p>
                  <p className={`text-6xl font-black ${scoreColor}`}>{analysis.score}</p>
                  <p className="text-gray-400 text-sm">/100</p>
                  <div className="w-full h-3 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        analysis.score >= 70 ? 'bg-green-500' : analysis.score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${analysis.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {analysis.score >= 70 ? '✅ Bon score — votre profil est bien aligné' :
                     analysis.score >= 50 ? '⚠️ Score moyen — suivez les suggestions ci-dessous' :
                     '❌ Score faible — plusieurs améliorations nécessaires'}
                  </p>
                </div>

                {/* Keywords */}
                <div className="card p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Mots-clés de l'offre</p>
                  <div>
                    <p className="text-xs text-green-700 font-medium mb-1.5">✓ Trouvés dans votre CV ({analysis.keywordsFound.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywordsFound.map(kw => (
                        <span key={kw} className="badge bg-green-100 text-green-700">{kw}</span>
                      ))}
                    </div>
                  </div>
                  {analysis.keywordsMissing.length > 0 && (
                    <div>
                      <p className="text-xs text-red-600 font-medium mb-1.5">✗ Manquants ({analysis.keywordsMissing.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.keywordsMissing.map(kw => (
                          <span key={kw} className="badge bg-red-50 text-red-600 border border-red-200">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="card p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      Suggestions d'amélioration ({analysis.suggestions.length})
                    </p>
                    <div className="space-y-2">
                      {analysis.suggestions.map((s, i) => {
                        const cfg = PRIORITY_CONFIG[s.priority]
                        const isOpen = expandedSugg === i
                        return (
                          <div key={i} className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}>
                            <button
                              onClick={() => setExpandedSugg(isOpen ? null : i)}
                              className="w-full flex items-center gap-2 p-3 text-left"
                            >
                              <span className={`text-xs font-bold ${cfg.color} shrink-0`}>{cfg.label}</span>
                              <span className="text-xs text-gray-700 flex-1">{s.message}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            </button>
                            {isOpen && s.example && (
                              <div className="px-3 pb-3">
                                <p className="text-xs text-gray-600 bg-white rounded p-2 border border-gray-100 italic">
                                  💡 {s.example}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Optimized summary */}
                {analysis.rewrittenSummary && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">Accroche CV optimisée</p>
                      <button
                        onClick={copySummary}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Copy size={12} /> {copied ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-primary/5 rounded-lg p-3 border border-primary/20">
                      {analysis.rewrittenSummary}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Collez ce texte en haut de votre CV pour maximiser votre score ATS sur ce poste.
                    </p>
                  </div>
                )}

                {/* CTA */}
                <Link
                  to="/jobs"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Voir les offres correspondantes <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
