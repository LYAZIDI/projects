import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MatchBadge from '../components/MatchBadge'
import { useCV } from '../context/CVContext'
import {
  Search, MapPin, Banknote, Wifi, Filter, ChevronRight,
  Briefcase, Zap, CheckCircle, XCircle, Upload, Loader, Star, TrendingUp, AlertCircle, Lightbulb, Target,
  RefreshCw, Globe, Settings, ExternalLink, Heart, GitCompare, BookmarkCheck
} from 'lucide-react'

const API = ''

interface ScoredJob {
  id: string
  title: string
  company: string
  location: string
  description: string
  salary: string
  type: string
  remote: boolean
  tags: string[]
  url: string
  logo: string
  postedAt: string
  source: string
  matchScore: number
  matchCategory?: 'excellent' | 'bon' | 'faible'
  matchedSkills?: string[]
  missingSkills?: string[]
  matchReason?: string
  scoreBreakdown?: { skills: number; titleFit: number; seniority: number; bonus: number }
}

interface MatchedResult {
  hasProfile: boolean
  excellent: ScoredJob[]
  bon: ScoredJob[]
  faible: ScoredJob[]
  total: number
  profileName?: string
  skillsUsed?: string[]
  scoredAt?: string
}

const CATEGORY_CONFIG = {
  excellent: {
    label: 'Excellent match',
    sub: 'Très compatible avec votre profil',
    color: 'bg-green-50 border-green-200',
    headerColor: 'text-green-700',
    dotColor: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
    icon: Star,
  },
  bon: {
    label: 'Bon match',
    sub: 'Plusieurs compétences correspondent',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    icon: TrendingUp,
  },
  faible: {
    label: 'Match partiel',
    sub: 'Compétences partiellement alignées',
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'text-gray-600',
    dotColor: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600',
    icon: AlertCircle,
  },
}

interface APIStatus {
  total: number
  lastFetch: string | null
  apis: {
    franceTravail: { active: boolean; label: string; url: string }
    adzuna: { active: boolean; label: string; url: string }
  }
  configured: boolean
}

export default function Jobs() {
  const { cv } = useCV()
  const [result, setResult] = useState<MatchedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [selected, setSelected] = useState<ScoredJob | null>(null)
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('jc_favorites') ?? '[]')) } catch { return new Set() }
  })
  const [compareJob, setCompareJob] = useState<ScoredJob | null>(null)

  const loadJobs = () => {
    setLoading(true)
    fetch(`${API}/api/jobs/matched`)
      .then(r => r.json())
      .then((data: MatchedResult) => {
        setResult(data)
        const first = data.excellent[0] ?? data.bon[0] ?? data.faible[0] ?? null
        setSelected(first)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadJobs()
    fetch(`${API}/api/discovery/status`)
      .then(r => r.json())
      .then(setApiStatus)
      .catch(() => {})
  }, [cv])

  const handleRefresh = () => {
    setRefreshing(true)
    // If APIs are configured, clear mock jobs and fetch fresh real ones
    const endpoint = apiStatus?.configured ? '/api/discovery/clear' : '/api/discovery/run'
    fetch(`${API}${endpoint}`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        console.log('[Jobs] Discovery result:', data)
        loadJobs()
        return fetch(`${API}/api/discovery/status`).then(r => r.json())
      })
      .then(setApiStatus)
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }

  const filterJobs = (jobs: ScoredJob[]) =>
    jobs.filter(j =>
      (!remoteOnly || j.remote) &&
      (j.title.toLowerCase().includes(query.toLowerCase()) ||
       j.company.toLowerCase().includes(query.toLowerCase()))
    )

  const allFiltered = result ? [
    ...filterJobs(result.excellent),
    ...filterJobs(result.bon),
    ...filterJobs(result.faible),
  ] : []

  const totalFiltered = allFiltered.length

  const scoreBar = (score: number, category?: string) => {
    const color = category === 'excellent' ? 'bg-green-500' : category === 'bon' ? 'bg-blue-500' : 'bg-gray-400'
    return (
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    )
  }

  const renderJobCard = (job: ScoredJob, idx: number) => {
    const isSelected = selected?.id === job.id
    const matched = job.matchedSkills ?? []
    const missing = job.missingSkills ?? []
    const cat = job.matchCategory ?? 'faible'
    const cfg = CATEGORY_CONFIG[cat]
    return (
      <button
        key={job.id}
        onClick={() => setSelected(job)}
        className={`w-full text-left card p-3 transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-300'}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.badge}`}>
            {idx + 1}
          </span>
          <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
            {job.logo}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-xs leading-tight">{job.title}</p>
            <p className="text-[10px] text-gray-500">{job.company} • {job.location.split(' ')[0]}</p>
          </div>
          <MatchBadge score={job.matchScore} size="sm" />
        </div>

        {scoreBar(job.matchScore, cat)}

        {result?.hasProfile && (
          <div className="flex flex-wrap gap-1 mt-2">
            {matched.slice(0, 3).map(s => (
              <span key={s} className="badge bg-green-100 text-green-700 text-[10px] flex items-center gap-0.5">
                <CheckCircle size={8} /> {s}
              </span>
            ))}
            {missing.slice(0, 2).map(s => (
              <span key={s} className="badge bg-red-50 text-red-400 text-[10px]">{s}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
          <span>{job.salary}</span>
          {job.remote && <span className="text-green-600">Remote</span>}
        </div>
      </button>
    )
  }

  const renderCategory = (
    cat: 'excellent' | 'bon' | 'faible',
    jobs: ScoredJob[]
  ) => {
    const filtered = filterJobs(jobs)
    if (filtered.length === 0) return null
    const cfg = CATEGORY_CONFIG[cat]
    const Icon = cfg.icon
    return (
      <div key={cat} className="mb-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.color} mb-2`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
          <Icon size={13} className={cfg.headerColor} />
          <span className={`text-xs font-bold ${cfg.headerColor}`}>{cfg.label}</span>
          <span className={`text-xs ${cfg.headerColor} opacity-70`}>— {filtered.length} offre{filtered.length > 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-2">
          {filtered.map((job, idx) => renderJobCard(job, idx))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offres recommandées</h1>
            <p className="text-gray-500 text-sm">
              {loading
                ? 'Analyse IA en cours…'
                : result?.hasProfile
                  ? `${totalFiltered} offres classées par compatibilité avec le profil de ${result.profileName}`
                  : `${totalFiltered} offres disponibles — chargez votre CV pour le matching IA`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Recherche…' : 'Nouvelles offres'}
            </button>
            {!cv && (
              <Link to="/onboarding" className="btn-primary flex items-center gap-2 text-sm">
                <Upload size={14} /> Charger mon CV
              </Link>
            )}
          </div>
        </div>

        {/* Sources banner */}
        {apiStatus && (
          <div className={`rounded-xl border p-3 mb-3 ${apiStatus.configured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              <Globe size={15} className={apiStatus.configured ? 'text-green-600' : 'text-amber-600'} />
              <span className={`text-xs font-semibold ${apiStatus.configured ? 'text-green-800' : 'text-amber-800'}`}>
                {apiStatus.configured
                  ? `Offres réelles activées — ${apiStatus.total} offres en base`
                  : 'Offres de démonstration — Connectez des APIs pour des offres réelles'}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {Object.values(apiStatus.apis).map(api => (
                  <span key={api.label} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${api.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {api.active ? '✓' : '○'} {api.label.split(' ')[0]}
                  </span>
                ))}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-xs text-primary hover:underline ml-1"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Recherche…' : 'Actualiser'}
                </button>
                <button onClick={() => setShowSources(s => !s)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5">
                  <Settings size={11} /> Config
                </button>
              </div>
            </div>

            {/* Setup panel */}
            {showSources && !apiStatus.configured && (
              <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-3">
                {Object.entries(apiStatus.apis).map(([key, api]) => (
                  <div key={key} className="bg-white rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-800">{api.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${api.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {api.active ? 'Connecté' : 'Non configuré'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">
                      {key === 'franceTravail'
                        ? 'API officielle Pôle Emploi, gratuite. Ajoutez FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET dans backend/.env'
                        : 'Agrège Indeed, Monster, Cadremploi. Gratuit 1000 appels/mois. Ajoutez ADZUNA_APP_ID et ADZUNA_API_KEY dans backend/.env'}
                    </p>
                    <a href={api.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-primary flex items-center gap-1 hover:underline font-medium">
                      <ExternalLink size={9} /> S'inscrire gratuitement
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI matching banner */}
        {result?.hasProfile ? (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center gap-3">
            <Zap size={18} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary">
                Matching IA activé — {result.skillsUsed?.length ?? 0} compétences analysées depuis votre CV
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(result.skillsUsed ?? []).slice(0, 8).map(s => (
                  <span key={s} className="badge bg-primary/10 text-primary text-[10px]">{s}</span>
                ))}
                {(result.skillsUsed?.length ?? 0) > 8 && (
                  <span className="badge bg-gray-100 text-gray-500 text-[10px]">+{(result.skillsUsed?.length ?? 0) - 8}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 text-xs text-gray-400">
              <p>{result.excellent.length} excellent{result.excellent.length > 1 ? 's' : ''}</p>
              <p>{result.bon.length} bon{result.bon.length > 1 ? 's' : ''}</p>
              <p>{result.faible.length} faible{result.faible.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
            <Upload size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Chargez votre CV pour activer le matching IA et voir les offres triées par compatibilité.
            </p>
            <Link to="/onboarding" className="btn-primary text-xs shrink-0">Charger mon CV</Link>
          </div>
        )}

        {/* Filters */}
        <div className="card p-3 mb-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher un poste ou une entreprise..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setRemoteOnly(!remoteOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${remoteOnly ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Wifi size={14} /> Remote
          </button>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Catégorie</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader size={20} className="animate-spin" />
            <span>Analyse IA en cours…</span>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Job list with categories */}
            <div className="w-80 shrink-0">
              {result && (
                <>
                  {renderCategory('excellent', result.excellent)}
                  {renderCategory('bon', result.bon)}
                  {renderCategory('faible', result.faible)}
                </>
              )}

              {totalFiltered === 0 && (
                <div className="card p-8 text-center text-gray-400">
                  <p className="font-medium">Aucune offre ne correspond aux filtres</p>
                </div>
              )}
            </div>

            {/* Job detail */}
            {selected && (
              <div className="flex-1 self-start sticky top-20 space-y-3">
                <div className="card p-6">
                  {/* ── Title block ── */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center font-bold text-xl shrink-0">
                      {selected.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">{selected.title}</h2>
                      <p className="text-gray-600 text-sm">{selected.company}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{selected.postedAt}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <MatchBadge score={selected.matchScore} />
                      {selected.matchCategory && (
                        <span className={`block text-xs mt-1 font-semibold ${CATEGORY_CONFIG[selected.matchCategory].headerColor}`}>
                          {CATEGORY_CONFIG[selected.matchCategory].label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Infos ── */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                    <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{selected.location}</span>
                    <span className="flex items-center gap-1.5"><Banknote size={13} className="text-gray-400" />{selected.salary}</span>
                    <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-gray-400" />{selected.type}</span>
                    {selected.remote && <span className="flex items-center gap-1.5 text-green-600 font-medium"><Wifi size={13} />Télétravail</span>}
                  </div>

                  {/* ── C. Tags harmonisés ── */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selected.tags
                      .filter(t => t.toLowerCase() !== 'unknown' && !t.toLowerCase().startsWith('emplois '))
                      .map(t => {
                        const isMatched = (selected.matchedSkills ?? []).includes(t)
                        return (
                          <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isMatched
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {isMatched && <CheckCircle size={9} />}
                            {t}
                          </span>
                        )
                      })}
                  </div>

                  {/* ── A. Analyse IA — contrastée ── */}
                  {result?.hasProfile && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 mb-4">
                      {/* Header */}
                      <div className={`flex items-center gap-2 px-4 py-2.5 ${
                        selected.matchScore >= 65 ? 'bg-green-500' : selected.matchScore >= 35 ? 'bg-blue-500' : 'bg-gray-400'
                      } text-white`}>
                        <Zap size={14} />
                        <span className="text-xs font-bold">Analyse de compatibilité IA</span>
                        <span className="ml-auto text-base font-black">{selected.matchScore}%</span>
                      </div>

                      <div className="p-4">
                        {/* Score bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${selected.matchScore >= 65 ? 'bg-green-500' : selected.matchScore >= 35 ? 'bg-blue-500' : 'bg-gray-400'}`}
                            style={{ width: `${selected.matchScore}%` }}
                          />
                        </div>

                        {/* Match reason */}
                        {selected.matchReason && (
                          <p className="text-xs text-gray-600 italic mb-3 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-primary/30">
                            {selected.matchReason}
                          </p>
                        )}

                        {/* A. Score breakdown — couleurs distinctes par dimension */}
                        {selected.scoreBreakdown && (
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                              { label: 'Compétences', val: selected.scoreBreakdown.skills,   max: 50, color: 'bg-violet-500', light: 'bg-violet-50 border-violet-200 text-violet-700' },
                              { label: 'Domaine',      val: selected.scoreBreakdown.titleFit, max: 25, color: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200 text-blue-700' },
                              { label: 'Séniorité',    val: selected.scoreBreakdown.seniority,max: 15, color: 'bg-amber-500',  light: 'bg-amber-50 border-amber-200 text-amber-700' },
                              { label: 'Langues',      val: selected.scoreBreakdown.bonus,    max: 10, color: 'bg-teal-500',   light: 'bg-teal-50 border-teal-200 text-teal-700' },
                            ].map(d => (
                              <div key={d.label} className={`rounded-lg border p-2.5 text-center ${d.light}`}>
                                <div className="text-lg font-black">{d.val}<span className="text-[10px] font-normal opacity-70">/{d.max}</span></div>
                                <div className="text-[10px] font-semibold mt-0.5">{d.label}</div>
                                <div className="w-full h-1.5 bg-white/60 rounded-full mt-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${(d.val / d.max) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matched / Missing */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                            <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                              <CheckCircle size={11} /> Matchées ({(selected.matchedSkills ?? []).length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(selected.matchedSkills ?? []).length > 0
                                ? (selected.matchedSkills ?? []).map(s => (
                                    <span key={s} className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium border border-green-200">{s}</span>
                                  ))
                                : <p className="text-[10px] text-gray-400">Aucune compétence directe</p>}
                            </div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                            <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                              <XCircle size={11} /> À développer ({(selected.missingSkills ?? []).length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(selected.missingSkills ?? [])
                                .filter(s => s.toLowerCase() !== 'unknown' && !s.toLowerCase().startsWith('emplois '))
                                .map(s => (
                                  <span key={s} className="inline-block px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-medium border border-red-200">{s}</span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Coach IA ── */}
                  {result?.hasProfile && (selected.missingSkills ?? []).filter(s => s.toLowerCase() !== 'unknown').length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={15} className="text-amber-600 shrink-0" />
                        <p className="text-sm font-semibold text-amber-800">Conseil Coach IA</p>
                        {selected.matchCategory === 'excellent' && (
                          <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Target size={9} /> Postulez maintenant
                          </span>
                        )}
                        {selected.matchCategory === 'bon' && (
                          <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                            Bon candidat
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-800 mb-2">
                        {selected.matchCategory === 'excellent' ? 'Pour maximiser vos chances sur cette offre :' :
                         selected.matchCategory === 'bon' ? 'Pour passer de bon à excellent candidat :' :
                         'Compétences manquantes pour ce poste :'}
                      </p>
                      <ul className="space-y-1.5">
                        {(selected.missingSkills ?? [])
                          .filter(s => s.toLowerCase() !== 'unknown' && !s.toLowerCase().startsWith('emplois '))
                          .slice(0, 3)
                          .map(skill => (
                            <li key={skill} className="flex items-start gap-2 text-xs text-amber-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              Mentionnez <span className="font-semibold">"{skill}"</span> dans votre CV ou votre lettre de motivation
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* ── Description ── */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-5">{selected.description}</p>

                  {/* ── B. Actions directes ── */}
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/apply/${selected.id}`}
                      className="btn-primary flex-1 text-center flex items-center justify-center gap-2 min-w-[160px]"
                    >
                      Préparer ma candidature <ChevronRight size={16} />
                    </Link>
                    <button
                      onClick={() => {
                        const next = new Set(favorites)
                        if (next.has(selected.id)) next.delete(selected.id)
                        else next.add(selected.id)
                        setFavorites(next)
                        localStorage.setItem('jc_favorites', JSON.stringify([...next]))
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        favorites.has(selected.id)
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      title={favorites.has(selected.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {favorites.has(selected.id)
                        ? <><BookmarkCheck size={15} /> Favori</>
                        : <><Heart size={15} /> Favori</>}
                    </button>
                    <button
                      onClick={() => setCompareJob(compareJob?.id === selected.id ? null : selected)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        compareJob?.id === selected.id
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Comparer avec une autre offre"
                    >
                      <GitCompare size={15} /> Comparer
                    </button>
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-1.5 text-sm"
                    >
                      <ExternalLink size={14} /> Voir l'offre
                    </a>
                  </div>
                </div>

                {/* ── Compare panel ── */}
                {compareJob && compareJob.id !== selected.id && (
                  <div className="card p-4 border-2 border-primary/30">
                    <p className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
                      <GitCompare size={13} /> Comparaison avec : {compareJob.title}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {[
                        { label: 'Offre sélectionnée', job: selected, side: 'left' },
                        { label: 'Offre comparée', job: compareJob, side: 'right' },
                      ].map(({ label, job }) => (
                        <div key={job.id}>
                          <p className="font-semibold text-gray-700 mb-2">{label}</p>
                          <p className="font-bold text-gray-900 text-sm mb-0.5">{job.title}</p>
                          <p className="text-gray-500 mb-2">{job.company}</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-gray-500">Compatibilité</span><span className={`font-bold ${job.matchScore >= 65 ? 'text-green-600' : job.matchScore >= 35 ? 'text-blue-600' : 'text-gray-500'}`}>{job.matchScore}%</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Salaire</span><span className="font-medium text-gray-700">{job.salary}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Lieu</span><span className="text-gray-700">{job.location.split(',')[0]}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Compétences ✓</span><span className="font-bold text-green-600">{(job.matchedSkills ?? []).length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">À développer</span><span className="font-bold text-red-500">{(job.missingSkills ?? []).length}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setCompareJob(null)} className="mt-3 text-[10px] text-gray-400 hover:text-gray-600 w-full text-center">
                      Fermer la comparaison
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
