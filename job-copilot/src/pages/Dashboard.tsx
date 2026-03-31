import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MatchBadge from '../components/MatchBadge'
import { useCV } from '../context/CVContext'
import { TrendingUp, Send, Calendar, Target, ChevronRight, FileText, Plus, Search, X, GripVertical, Upload, Star, Zap, Trophy, Sparkles, MapPin, Banknote, Download } from 'lucide-react'

const API = 'http://localhost:3002'

type Status = 'to_apply' | 'applied' | 'interview' | 'offer' | 'rejected'

interface AppCard {
  id: string
  company: string
  title: string
  logo: string
  matchScore: number
  jobId: string
  nextAction?: string
  updatedAt: string
}

const COLUMNS: { id: Status; label: string; color: string; dot: string; addLabel: string }[] = [
  { id: 'to_apply',  label: 'À postuler',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   addLabel: 'Ajouter une offre' },
  { id: 'applied',   label: 'Postulé',     color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', addLabel: 'Ajouter une relance' },
  { id: 'interview', label: 'Entretien',   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', addLabel: 'Planifier entretien' },
  { id: 'offer',     label: 'Offre',       color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  addLabel: 'Voir l\'offre' },
  { id: 'rejected',  label: 'Refus',       color: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    addLabel: 'Archiver' },
]

const EMPTY_CARDS: Record<Status, AppCard[]> = {
  to_apply: [], applied: [], interview: [], offer: [], rejected: [],
}

export default function Dashboard() {
  const { cv } = useCV()
  const [cards, setCards] = useState(EMPTY_CARDS)
  const [search, setSearch] = useState('')
  const [dragCard, setDragCard] = useState<{ card: AppCard; from: Status } | null>(null)
  const [dragOver, setDragOver] = useState<Status | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([])
  const [matchProfile, setMatchProfile] = useState<{ hasProfile: boolean; profileName?: string } | null>(null)
  const [downloadingDocx, setDownloadingDocx] = useState(false)

  async function downloadCVDocx() {
    setDownloadingDocx(true)
    try {
      const res = await fetch(`${API}/api/cv/generate-docx`)
      if (!res.ok) throw new Error('Erreur')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${cv?.name?.replace(/\s+/g, '_') || 'CV'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Impossible de générer le CV Word. Vérifiez que le backend est lancé.')
    } finally {
      setDownloadingDocx(false)
    }
  }

  // Fetch recommended jobs using the matched pipeline
  useEffect(() => {
    fetch(`${API}/api/jobs/matched`)
      .then(r => r.json())
      .then(data => {
        setMatchProfile({ hasProfile: data.hasProfile, profileName: data.profileName })
        // Show top 3: prefer excellent, then bon
        const top = [
          ...(data.excellent ?? []),
          ...(data.bon ?? []),
          ...(data.faible ?? []),
        ].slice(0, 3)
        setRecommendedJobs(top)
      })
      .catch(() => {})
  }, [cv])

  // Stats computed from kanban state + CV
  const stats = useMemo(() => {
    const allCards = Object.values(cards).flat()
    const total = allCards.length
    const interviewCount = cards.interview.length + cards.offer.length
    const responded = interviewCount + cards.rejected.length
    const responseRate = cards.applied.length + responded > 0
      ? Math.round((responded / (cards.applied.length + responded)) * 100)
      : 0
    const avgScore = total > 0
      ? Math.round(allCards.reduce((s, c) => s + c.matchScore, 0) / total)
      : cv?.atsScore ?? 0

    return [
      { label: 'Candidatures', value: String(total || 0), sub: total ? `${cards.applied.length} en cours` : 'Aucune pour l\'instant', icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Taux de réponse', value: responded > 0 ? `${responseRate}%` : '—', sub: 'Basé sur vos candidatures', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Entretiens', value: String(interviewCount), sub: cards.interview.length ? `${cards.interview.length} à venir` : 'Aucun planifié', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Score ATS CV', value: cv ? `${cv.atsScore}/100` : '—', sub: cv ? (cv.sector === 'transport' ? 'Secteur Transport ✓' : cv.sector === 'tech' ? 'Secteur Tech ✓' : `${cv.skills.length} compétences`) : 'CV non chargé', icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
    ]
  }, [cards, cv])

  // Filter cards by search
  const filtered = (col: Status) =>
    cards[col].filter(c =>
      !search ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
    )

  function onDragStart(card: AppCard, from: Status, node: HTMLDivElement) {
    dragNode.current = node
    setTimeout(() => setDragCard({ card, from }), 0)
  }

  function onDragEnter(to: Status) { setDragOver(to) }

  function onDrop(to: Status) {
    if (!dragCard || dragCard.from === to) { reset(); return }
    setCards(prev => {
      const fromCards = prev[dragCard.from].filter(c => c.id !== dragCard.card.id)
      const toCards = [...prev[to], { ...dragCard.card, updatedAt: 'à l\'instant' }]
      return { ...prev, [dragCard.from]: fromCards, [to]: toCards }
    })
    reset()
  }

  function reset() { setDragCard(null); setDragOver(null) }

  function addCard(col: Status) {
    const mockNew: AppCard = {
      id: `new-${Date.now()}`,
      company: 'Nouvelle entreprise',
      title: 'Poste à définir',
      logo: '+',
      matchScore: Math.floor(Math.random() * 30) + 60,
      jobId: '1',
      updatedAt: 'à l\'instant',
    }
    setCards(prev => ({ ...prev, [col]: [mockNew, ...prev[col]] }))
  }

  const firstName = cv?.name?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {firstName ?? ''}  👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {cv
                ? `${cv.yearsExperience > 0 ? `${cv.yearsExperience} ans d'expérience • ` : ''}${cv.skills.length} compétences détectées dans votre CV`
                : 'Chargez votre CV pour personnaliser votre tableau de bord'}
            </p>
          </div>
          <Link to="/jobs" className="btn-primary flex items-center gap-2">
            <Target size={16} /> Trouver des offres
          </Link>
        </div>

        {/* CV Banner — if no CV loaded */}
        {!cv && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Upload size={18} className="text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Aucun CV chargé</p>
              <p className="text-xs text-amber-600">Uploadez votre CV pour obtenir des offres personnalisées et un score de matching</p>
            </div>
            <Link to="/onboarding" className="btn-primary text-sm">Charger mon CV</Link>
          </div>
        )}

        {/* CV Profile Card — if CV loaded */}
        {cv && (
          <div className="card p-4 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900">{cv.name}</p>
                {cv.email && <span className="text-xs text-gray-400">{cv.email}</span>}
                {cv.phone && <span className="text-xs text-gray-400">• {cv.phone}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {cv.skills.slice(0, 8).map(s => (
                  <span key={s} className="badge bg-primary/10 text-primary">{s}</span>
                ))}
                {cv.skills.length > 8 && (
                  <span className="badge bg-gray-100 text-gray-500">+{cv.skills.length - 8}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-2xl font-bold ${cv.atsScore >= 70 ? 'text-green-600' : 'text-yellow-500'}`}>
                {cv.atsScore}<span className="text-sm font-normal text-gray-400">/100</span>
              </p>
              <p className="text-xs text-gray-500">Score ATS</p>
              {cv.atsMissing.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Manque : {cv.atsMissing.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={downloadCVDocx}
                disabled={downloadingDocx}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors disabled:opacity-60"
              >
                {downloadingDocx
                  ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  : <Download size={12} />
                }
                CV Word
              </button>
              <Link to="/onboarding" className="btn-secondary text-xs text-center">Changer CV</Link>
            </div>
          </div>
        )}

        {/* ── Job parfait du jour ── */}
        {recommendedJobs[0] && recommendedJobs[0].matchCategory === 'excellent' && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white">
              <Trophy size={14} className="shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wide">Votre job parfait du jour</span>
              <span className="ml-auto text-xs opacity-80">Matching IA</span>
            </div>
            <div className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center font-bold text-xl shrink-0">
                {recommendedJobs[0].logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{recommendedJobs[0].title}</p>
                <p className="text-sm text-gray-600">{recommendedJobs[0].company}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={11} />{recommendedJobs[0].location}</span>
                  <span className="flex items-center gap-1"><Banknote size={11} />{recommendedJobs[0].salary}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {((recommendedJobs[0].matchedSkills ?? []) as string[]).slice(0, 4).map((s: string) => (
                    <span key={s} className="badge bg-green-100 text-green-700 flex items-center gap-0.5 text-[10px]">
                      <Star size={8} /> {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <div className="text-3xl font-black text-green-600">{recommendedJobs[0].matchScore}%</div>
                <p className="text-xs text-gray-500">compatibilité</p>
                <Link to={`/apply/${recommendedJobs[0].id}`} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Sparkles size={14} /> Préparer ma candidature
                </Link>
              </div>
            </div>
            {recommendedJobs[0].matchReason && (
              <div className="px-4 pb-3">
                <p className="text-xs text-green-700 italic bg-green-100 rounded-lg px-3 py-2">
                  {recommendedJobs[0].matchReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center shrink-0`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xs font-medium ${s.color}`}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Mes candidatures</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrer…"
                  className="pl-7 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-36"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 border-l border-gray-200 pl-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≥85%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />70–84%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />&lt;70%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map(col => {
              const colCards = filtered(col.id)
              const isDragTarget = dragOver === col.id
              return (
                <div
                  key={col.id}
                  className={`min-w-[195px] flex-1 rounded-xl transition-colors duration-150 ${isDragTarget ? 'bg-primary/5 ring-2 ring-primary/30' : ''}`}
                  onDragOver={e => { e.preventDefault(); onDragEnter(col.id) }}
                  onDrop={() => onDrop(col.id)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className={`badge ${col.color} font-semibold`}>{col.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{colCards.length}</span>
                  </div>

                  <div className="space-y-2 min-h-[80px]">
                    {colCards.map(app => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={e => onDragStart(app, col.id, e.currentTarget as HTMLDivElement)}
                        onDragEnd={reset}
                        className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
                          dragCard?.card.id === app.id ? 'opacity-40 scale-95' : 'hover:shadow-sm hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical size={12} className="text-gray-300 mt-0.5 shrink-0" />
                          <div className="w-7 h-7 bg-primary text-white rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                            {app.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{app.company}</p>
                            <p className="text-xs text-gray-500 truncate">{app.title}</p>
                          </div>
                        </div>
                        <MatchBadge score={app.matchScore} size="sm" />
                        {app.nextAction && (
                          <p className="text-xs text-amber-600 mt-1.5 truncate font-medium">⏰ {app.nextAction}</p>
                        )}
                        <p className="text-xs text-gray-300 mt-1.5">Mis à jour : {app.updatedAt}</p>
                      </div>
                    ))}

                    {colCards.length === 0 && !search && (
                      <div className={`border-2 border-dashed rounded-lg p-3 text-center text-xs transition-colors ${isDragTarget ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-400'}`}>
                        {isDragTarget ? 'Déposer ici' : 'Vide'}
                      </div>
                    )}

                    <button
                      onClick={() => addCard(col.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <Plus size={12} /> {col.addLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            💡 Glissez-déposez les cartes pour changer le statut d'une candidature
          </p>
        </div>

        {/* Recommended jobs */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Offres recommandées pour vous</h2>
              {matchProfile?.hasProfile ? (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Zap size={11} className="text-primary" />
                  Matching IA — {matchProfile.profileName}
                </p>
              ) : cv ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  Basé sur vos compétences : {cv.skills.slice(0, 4).join(', ')}{cv.skills.length > 4 ? '…' : ''}
                </p>
              ) : null}
            </div>
            <Link to="/jobs" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recommendedJobs.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <p>Aucune offre disponible pour l'instant.</p>
                <Link to="/onboarding" className="text-primary text-xs underline mt-1 block">Chargez votre CV pour obtenir des recommandations</Link>
              </div>
            ) : recommendedJobs.map(job => {
              const catColors: Record<string, string> = {
                excellent: 'bg-green-100 text-green-700',
                bon: 'bg-blue-100 text-blue-700',
                faible: 'bg-gray-100 text-gray-600',
              }
              const cat = job.matchCategory ?? 'faible'
              return (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                  <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold shrink-0">
                    {job.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                      {job.matchCategory && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${catColors[cat]}`}>
                          {cat === 'excellent' ? 'Excellent' : cat === 'bon' ? 'Bon match' : 'Partiel'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{job.company} • {job.location} • {job.salary}</p>
                    {(job.matchedSkills ?? []).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(job.matchedSkills as string[]).slice(0, 3).map((t: string) => (
                          <span key={t} className="badge bg-green-100 text-green-700 flex items-center gap-0.5 text-[10px]">
                            <Star size={8} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <MatchBadge score={job.matchScore} />
                  <Link to={`/apply/${job.id}`} className="btn-primary flex items-center gap-1.5 text-sm">
                    Préparer <ChevronRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
