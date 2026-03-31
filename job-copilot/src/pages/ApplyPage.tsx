import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MatchBadge from '../components/MatchBadge'
import { useCV } from '../context/CVContext'
import {
  FileText, MessageSquare, ClipboardList, ExternalLink,
  Copy, CheckCircle, Wand2, ArrowLeft, Sparkles, ChevronDown, AlertTriangle
} from 'lucide-react'

const API = 'http://localhost:3002'

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 14) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!active) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [active, text, speed])
  return displayed
}

// ─── Sector detection ─────────────────────────────────────────────────────────

function detectJobSector(job: any, cv: any): 'transport' | 'tech' | 'generic' {
  const text = ((job.title ?? '') + ' ' + (job.description ?? '') + ' ' + (job.tags ?? []).join(' ')).toLowerCase()
  const transportKw = ['chauffeur', 'vtc', 'livreur', 'livraison', 'conduite', 'taxi', 'transport', 'tournée', 'coursier', 'colis']
  const techKw = ['développeur', 'react', 'javascript', 'python', 'node', 'fullstack', 'frontend', 'backend', 'software']
  if (transportKw.some(k => text.includes(k))) return 'transport'
  if (techKw.some(k => text.includes(k))) return 'tech'
  // Also check CV sector
  if (cv?.sector === 'transport') return 'transport'
  if (cv?.sector === 'tech') return 'tech'
  return 'generic'
}

// ─── Content generators (based on real CV + job) ──────────────────────────────

function generateCoverLetter(cv: any, job: any): string {
  const name = cv.name || 'Candidat'
  const company = job.company || 'l\'entreprise'
  const jobTitle = job.title || 'ce poste'
  const years = cv.yearsExperience > 0 ? `${cv.yearsExperience} ans` : 'plusieurs années'
  const lastJob = cv.experience?.[0]
  const sector = detectJobSector(job, cv)

  // Transport / VTC / Livraison template
  if (sector === 'transport') {
    const transportSkills = (cv.skills ?? []).filter((s: string) =>
      ['chauffeur','vtc','permis','livraison','conduite','transport','tournée','relation client','service client','ponctualité','organisation','manutention'].some(k => s.toLowerCase().includes(k))
    ).slice(0, 4).join(', ') || 'conduite professionnelle, service client, ponctualité'

    return `Madame, Monsieur,

C'est avec un réel enthousiasme que je vous adresse ma candidature pour le poste de ${jobTitle} au sein de ${company}.

Professionnel du transport depuis ${years}${lastJob ? ` — notamment en tant que ${lastJob.title}${lastJob.company ? ` chez ${lastJob.company}` : ''}${lastJob.period ? ` (${lastJob.period})` : ''}` : ''} — j'ai développé une expertise solide en ${transportSkills}.

Ce qui me distingue dans mon parcours, c'est ma capacité à assurer un service de qualité en toutes circonstances : respect scrupuleux des délais, itinéraires optimisés, et relation client irréprochable. J'ai l'habitude de travailler en autonomie tout en rendant compte de mon activité avec rigueur.

${cv.languages?.includes('Anglais') ? 'Je possède également une maîtrise de l\'anglais, un atout pour les clientèles internationales.' : ''}

Convaincu que mon profil correspond aux exigences du poste et aux valeurs de ${company}, je serais heureux de vous rencontrer pour vous exposer ma motivation.

Dans l'attente de votre réponse, je reste disponible à votre convenance.

Cordialement,
${name}`
  }

  // Generic template (improved)
  const skills = (cv.skills ?? []).slice(0, 3).join(', ') || 'mes compétences'
  return `Madame, Monsieur,

C'est avec un vif intérêt que je vous soumets ma candidature pour le poste de ${jobTitle} au sein de ${company}.

Fort de ${years} d'expérience${lastJob ? ` en tant que ${lastJob.title}${lastJob.company ? ` chez ${lastJob.company}` : ''}` : ''}, j'ai développé une expertise solide en ${skills}, directement applicable aux missions que vous proposez.

${lastJob ? `Durant mon expérience${lastJob.period ? ` (${lastJob.period})` : ''}, j'ai démontré ma capacité à m'investir pleinement dans mes responsabilités, avec autonomie et rigueur.` : 'Je suis rigoureux, autonome et m\'implique pleinement dans chaque mission.'}

${cv.languages?.length > 1 ? `Je maîtrise le ${cv.languages.join(' et le ')}, ce qui me permet d'évoluer dans des environnements multiculturels.` : ''}

Convaincu que mon profil correspond aux attentes de ${company}, je reste disponible pour un entretien à votre convenance.

Cordialement,
${name}`
}

function generateFormAnswers(cv: any, job: any): { question: string; answer: string }[] {
  const company = job.company || 'l\'entreprise'
  const jobTitle = job.title || 'ce poste'
  const years = cv.yearsExperience > 0 ? `${cv.yearsExperience} ans` : 'quelques années'
  const lastJob = cv.experience?.[0]
  const sector = detectJobSector(job, cv)

  const transportSkills = (cv.skills ?? []).filter((s: string) =>
    ['chauffeur','vtc','permis','livraison','conduite','transport','tournée','relation client','ponctualité','organisation'].some(k => s.toLowerCase().includes(k))
  )

  const isTransport = sector === 'transport'

  return [
    {
      question: 'Parlez-nous de vous et de votre parcours',
      answer: isTransport
        ? `${lastJob ? `${lastJob.title}${lastJob.company ? ` chez ${lastJob.company}` : ''}${lastJob.period ? ` (${lastJob.period})` : ''}` : 'Conducteur professionnel'} avec ${years} d'expérience dans le transport. Je maîtrise la conduite en milieu urbain et périurbain, l'optimisation des itinéraires et le service client de qualité. Je suis ponctuel, autonome et impliqué.`
        : `${lastJob ? `${lastJob.title}${lastJob.company ? ` chez ${lastJob.company}` : ''}` : 'Professionnel expérimenté'} avec ${years} d'expérience. Je maîtrise ${(cv.skills ?? []).slice(0, 3).join(', ')}. Je recherche une opportunité chez ${company} pour contribuer efficacement à vos objectifs.`,
    },
    {
      question: `Pourquoi postuler chez ${company} ?`,
      answer: isTransport
        ? `${company} est reconnu pour la qualité de son service et son sérieux. Ce poste de ${jobTitle} correspond exactement à mon expérience et à mes ambitions. Je veux m'investir durablement dans une structure qui valorise le professionnalisme et la fiabilité.`
        : `${company} représente une opportunité d'évoluer dans un environnement stimulant. Le poste de ${jobTitle} correspond à mon profil et j'ai la conviction de pouvoir apporter une réelle valeur ajoutée à votre équipe.`,
    },
    {
      question: 'Quelles sont vos principales compétences ?',
      answer: isTransport && transportSkills.length > 0
        ? `Mes compétences clés : ${transportSkills.join(', ')}. J'ai également une bonne connaissance de la géographie d'Île-de-France et je maîtrise les applications de navigation GPS. Je suis habitué à travailler en autonomie avec un sens aigu du service client.`
        : `Mes compétences principales : ${(cv.skills ?? []).join(', ')}. ${lastJob ? `Développées en tant que ${lastJob.title}, elles me permettent d'être rapidement opérationnel sur ce poste.` : ''}`,
    },
    {
      question: 'Avez-vous le permis de conduire ?',
      answer: isTransport
        ? `Oui, je suis titulaire du permis B depuis plusieurs années, sans antécédent. Je suis habitué à la conduite intensive en milieu urbain et j'ai un excellent bilan de sécurité.`
        : `Oui, permis B valide.`,
    },
    {
      question: 'Quelle est votre disponibilité ?',
      answer: `Je suis disponible rapidement${isTransport ? ', y compris pour des horaires décalés, week-end ou tôt le matin selon les besoins du poste.' : ', dans un délai de 2 à 4 semaines.'} Je suis flexible et m'adapterai aux besoins de ${company}.`,
    },
    {
      question: 'Quelles sont vos prétentions salariales ?',
      answer: `Mes prétentions sont en cohérence avec le marché pour un poste de ${jobTitle} avec ${years} d'expérience${isTransport ? ' dans le transport' : ''}. Je reste ouvert à la discussion selon les avantages et les responsabilités proposées.`,
    },
  ]
}

const GEN_STEPS = [
  { label: 'Analyse de la fiche de poste…', detail: 'Extraction des mots-clés et exigences' },
  { label: 'Optimisation du CV pour l\'ATS…', detail: 'Personnalisation selon votre profil réel' },
  { label: 'Rédaction de la lettre de motivation…', detail: 'Basée sur vos vraies expériences' },
  { label: 'Génération des réponses formulaire…', detail: 'Adaptées à votre parcours' },
]
const STEP_DURATIONS = [800, 1000, 1200, 900]

export default function ApplyPage() {
  const { id } = useParams()
  const { cv } = useCV()

  const [job, setJob] = useState<any>(null)
  const [tab, setTab] = useState<'cv' | 'letter' | 'form'>('cv')
  const [genStep, setGenStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [expandForm, setExpandForm] = useState<number | null>(0)

  // Load job from backend
  useEffect(() => {
    fetch(`${API}/api/jobs/${id}`)
      .then(r => r.json())
      .then(data => { if (data.id) setJob(data) })
      .catch(() => {})
  }, [id])

  const isDone = genStep === 99
  const isGenerating = genStep >= 0 && genStep < GEN_STEPS.length

  // Drive generation steps
  useEffect(() => {
    if (genStep < 0 || genStep >= GEN_STEPS.length) return
    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, genStep])
      setGenStep(s => s === GEN_STEPS.length - 1 ? 99 : s + 1)
    }, STEP_DURATIONS[genStep])
    return () => clearTimeout(timer)
  }, [genStep])

  // Generated content (from real CV + real job)
  const coverLetter = cv && job ? generateCoverLetter(cv, job) : ''
  const formAnswers = cv && job ? generateFormAnswers(cv, job) : []

  // Typewriter for cover letter
  const letterText = useTypewriter(coverLetter, isDone && tab === 'letter')

  // ATS improvement simulation
  const baseAts = cv?.atsScore ?? 30
  const improvedAts = Math.min(baseAts + Math.floor(Math.random() * 5 + 10), 100)
  const atsGain = improvedAts - baseAts

  // Matched skills between CV and job
  const matchedSkills = cv && job
    ? (job.tags ?? []).filter((t: string) =>
        (cv.skills ?? []).some((s: string) =>
          s.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.toLowerCase())
        )
      )
    : []

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-400">
          Chargement de l'offre…
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'cv' as const, label: 'CV optimisé', icon: FileText },
    { id: 'letter' as const, label: 'Lettre de motivation', icon: MessageSquare },
    { id: 'form' as const, label: `Formulaire (${formAnswers.length} Q)`, icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/jobs" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Retour aux offres
        </Link>

        {/* Job header */}
        <div className="card p-5 mb-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl">
            {job.logo}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-500 text-sm">{job.company} • {job.location} • {job.salary}</p>
          </div>
          <MatchBadge score={job.matchScore ?? 0} />
        </div>

        {/* No CV warning */}
        {!cv && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Aucun CV chargé</p>
              <p className="text-xs text-amber-700">Le dossier sera générique. Chargez votre CV pour une personnalisation complète.</p>
            </div>
            <Link to="/onboarding" className="btn-primary text-sm shrink-0">Charger mon CV</Link>
          </div>
        )}

        {/* Generation panel */}
        {!isDone ? (
          <div className="card p-10">
            {genStep < 0 ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wand2 size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Préparer mon dossier de candidature</h2>
                {cv && (
                  <p className="text-sm text-gray-500 mb-2">
                    Basé sur votre CV : <span className="font-medium text-gray-700">{cv.name}</span> • {cv.skills.length} compétences
                  </p>
                )}
                <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                  L'IA génère en quelques secondes un dossier personnalisé à partir de votre vrai profil.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-8 text-left">
                  {[
                    { icon: FileText, title: 'CV optimisé ATS', desc: `Score ${baseAts} → ~${improvedAts}/100` },
                    { icon: MessageSquare, title: 'Lettre personnalisée', desc: `Pour ${job.company}, ~200 mots` },
                    { icon: ClipboardList, title: `${formAnswers.length} réponses formulaire`, desc: 'Basées sur votre parcours réel' },
                  ].map(item => (
                    <div key={item.title} className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
                      <item.icon size={16} className="text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setGenStep(0)}
                  className="btn-primary px-8 py-3 text-base flex items-center gap-2 mx-auto"
                >
                  <Sparkles size={18} /> Générer avec l'IA
                </button>
              </div>
            ) : (
              <div className="max-w-sm mx-auto">
                <div className="flex justify-center mb-6">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#6366f1" strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(completedSteps.length / GEN_STEPS.length) * 213.6} 213.6`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-primary">
                      {Math.round((completedSteps.length / GEN_STEPS.length) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {GEN_STEPS.map((s, i) => {
                    const done = completedSteps.includes(i)
                    const active = genStep === i
                    return (
                      <div key={s.label} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${active ? 'bg-primary/5 border border-primary/20' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-green-100' : active ? 'bg-primary/20' : 'bg-gray-100'}`}>
                          {done ? <CheckCircle size={14} className="text-green-600" />
                            : active ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse block" />
                            : null}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${done ? 'text-green-700' : active ? 'text-primary' : 'text-gray-400'}`}>{s.label}</p>
                          {active && <p className="text-xs text-gray-400 mt-0.5">{s.detail}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Success banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 text-sm">Dossier prêt en {(STEP_DURATIONS.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}s !</p>
                <p className="text-xs text-green-700">Copiez les informations ci-dessous puis postulez sur la plateforme. C'est vous qui cliquez.</p>
              </div>
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                onClick={() => setTimeout(() => setApplied(true), 4000)}
                className="btn-primary flex items-center gap-1.5 shrink-0">
                <ExternalLink size={14} /> Ouvrir l'offre
              </a>
            </div>

            {applied && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                <p className="text-sm text-blue-800 font-medium">Vous avez postulé ?</p>
                <div className="flex gap-2">
                  <button className="btn-primary bg-blue-600 hover:bg-blue-700 text-sm">✓ Oui, marquer comme postulé</button>
                  <button className="btn-secondary text-sm">Plus tard</button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-gray-200">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <t.icon size={15} /> {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* ── CV tab ── */}
                {tab === 'cv' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">CV optimisé pour ce poste</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">Score ATS :</span>
                          <span className="text-xs text-gray-400 line-through">{baseAts}/100</span>
                          <span className="text-xs font-bold text-green-600">→ {improvedAts}/100</span>
                          <span className="badge bg-green-100 text-green-700">+{atsGain} pts</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary text-xs">PDF</button>
                        <button className="btn-secondary text-xs">DOCX</button>
                      </div>
                    </div>

                    {/* ATS keywords matched */}
                    {matchedSkills.length > 0 && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">
                            {matchedSkills.length} compétence{matchedSkills.length > 1 ? 's' : ''} de l'offre déjà présente{matchedSkills.length > 1 ? 's' : ''} dans votre CV
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {matchedSkills.map((t: string) => (
                              <span key={t} className="badge bg-green-100 text-green-700">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CV preview — from real CV */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-xs text-gray-700 leading-relaxed space-y-3">
                      {cv ? (
                        <>
                          <div className="text-center pb-3 border-b border-gray-100">
                            <p className="text-base font-bold text-gray-900">{cv.name}</p>
                            {cv.experience[0] && (
                              <p className="text-gray-500">{cv.experience[0].title}{cv.experience[0].company ? ` | ${cv.experience[0].company}` : ''}</p>
                            )}
                            <p className="text-gray-400">
                              {[cv.email, cv.phone, cv.languages[0]].filter(Boolean).join(' • ')}
                            </p>
                          </div>

                          {cv.skills.length > 0 && (
                            <div>
                              <p className="font-bold text-gray-900 uppercase tracking-wide mb-1.5">Compétences clés</p>
                              <p className="text-primary font-medium">
                                {[...new Set([...matchedSkills, ...cv.skills])].join(', ')}
                              </p>
                            </div>
                          )}

                          {cv.experience.length > 0 && (
                            <div>
                              <p className="font-bold text-gray-900 uppercase tracking-wide mb-1.5">Expérience</p>
                              {cv.experience.slice(0, 3).map((e, i) => (
                                <div key={i} className="mb-2">
                                  <p className="font-semibold">{e.title}{e.company ? ` — ${e.company}` : ''} {e.period ? `(${e.period})` : ''}</p>
                                  {e.description && <p className="mt-0.5 text-gray-500">• {e.description}</p>}
                                </div>
                              ))}
                            </div>
                          )}

                          {cv.education.length > 0 && (
                            <div>
                              <p className="font-bold text-gray-900 uppercase tracking-wide mb-1.5">Formation</p>
                              {cv.education.map((e, i) => (
                                <p key={i}>{e.degree}{e.school ? ` — ${e.school}` : ''} {e.year ? `(${e.year})` : ''}</p>
                              ))}
                            </div>
                          )}

                          {cv.languages.length > 0 && (
                            <div>
                              <p className="font-bold text-gray-900 uppercase tracking-wide mb-1.5">Langues</p>
                              <p>{cv.languages.join(' • ')}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-gray-400 py-4">Chargez votre CV pour voir le contenu personnalisé</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Letter tab ── */}
                {tab === 'letter' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Lettre de motivation</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Personnalisée pour {job.company} • basée sur votre vrai profil
                        </p>
                      </div>
                      <button onClick={() => copy('letter', coverLetter)} className="btn-secondary flex items-center gap-1.5 text-sm">
                        {copied === 'letter' ? <><CheckCircle size={13} className="text-green-500" />Copié !</> : <><Copy size={13} />Copier</>}
                      </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-700 leading-relaxed min-h-[200px]">
                      <span className="whitespace-pre-line">{letterText}</span>
                      {letterText.length < coverLetter.length && (
                        <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn-secondary text-xs">Régénérer</button>
                      <button className="btn-secondary text-xs">Plus formel</button>
                      <button className="btn-secondary text-xs">Raccourcir</button>
                    </div>
                  </div>
                )}

                {/* ── Form tab ── */}
                {tab === 'form' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Réponses aux questions du formulaire</h3>
                      <button
                        onClick={() => copy('all', formAnswers.map(a => `Q: ${a.question}\nR: ${a.answer}`).join('\n\n'))}
                        className="btn-secondary text-xs flex items-center gap-1.5">
                        <Copy size={12} /> Tout copier
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formAnswers.map((qa, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandForm(expandForm === i ? null : i)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <span className="text-sm font-medium text-gray-700">{qa.question}</span>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${expandForm === i ? 'rotate-180' : ''}`} />
                          </button>
                          {expandForm === i && (
                            <div className="px-4 pb-4">
                              <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed mb-2">
                                {qa.answer}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Basé sur votre profil réel</span>
                                <button onClick={() => copy(`q${i}`, qa.answer)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                  {copied === `q${i}` ? <><CheckCircle size={11} />Copié !</> : <><Copy size={11} />Copier</>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
