import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, FileText, Zap, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { useCV } from '../context/CVContext'

const API = 'http://localhost:3002'

const STEPS = ['Upload CV', 'Analyse IA', 'Profil', "C'est parti !"]

const ANALYSIS_STEPS = [
  { label: 'Lecture du fichier…' },
  { label: 'Extraction du texte…' },
  { label: 'Identification des compétences…' },
  { label: 'Analyse des expériences…' },
  { label: 'Calcul du score ATS…' },
  { label: 'Génération du profil…' },
]

interface ParsedCV {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: { title: string; company: string; period: string }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
  atsScore: number
  atsKeywordsFound: string[]
  atsMissing: string[]
  yearsExperience: number
}

export default function Onboarding() {
  const { setCV } = useCV()
  const [step, setStep] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(-1)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCV | null>(null)
  const [error, setError] = useState('')
  const [visibleSkills, setVisibleSkills] = useState<string[]>([])
  const [atsScore, setAtsScore] = useState(0)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function downloadCVDocx() {
    setDownloadingDocx(true)
    try {
      const res = await fetch(`${API}/api/cv/generate-docx`)
      if (!res.ok) throw new Error('Erreur génération')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CV_${parsed?.name?.replace(/\s+/g, '_') || 'CV'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Impossible de générer le CV Word. Vérifiez que le backend est lancé.')
    } finally {
      setDownloadingDocx(false)
    }
  }

  // Drive the analysis animation steps while the API call runs
  useEffect(() => {
    if (analysisStep < 0 || analysisStep >= ANALYSIS_STEPS.length - 1) return
    const timer = setTimeout(() => setAnalysisStep(s => s + 1), 600 + Math.random() * 400)
    return () => clearTimeout(timer)
  }, [analysisStep])

  // Once parsed data arrives, show step 1 results
  useEffect(() => {
    if (!parsed) return
    setStep(1)
    setAnalysisStep(-1)
    // Animate skills
    parsed.skills.forEach((_, i) => {
      setTimeout(() => setVisibleSkills(prev => [...prev, parsed.skills[i]]), i * 100)
    })
    // Animate ATS score counter
    let current = 0
    const target = parsed.atsScore
    const interval = setInterval(() => {
      current += 2
      setAtsScore(Math.min(current, target))
      if (current >= target) clearInterval(interval)
    }, 25)
    return () => clearInterval(interval)
  }, [parsed])

  async function uploadFile(file: File) {
    setFileName(file.name)
    setError('')
    setAnalysisStep(0)

    const formData = new FormData()
    formData.append('cv', file)

    try {
      const res = await fetch(`${API}/api/cv/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      // Let animation run at least 2 seconds before showing results
      setTimeout(() => {
        setParsed(data.parsed)
        setCV(data.parsed, file.name)
      }, 2000)
    } catch (err: any) {
      setAnalysisStep(-1)
      setError(err.message || 'Le backend n\'est pas accessible. Lance `npm run dev` dans /backend.')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  // Fallback: use mock data if backend not available
  function useMockData() {
    setError('')
    setFileName('Thomas_Martin_CV_mock.pdf')
    setAnalysisStep(0)
    setTimeout(() => {
      const mock = {
        name: 'Thomas Martin',
        email: 'thomas.martin@email.com',
        phone: '+33 6 12 34 56 78',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Git', 'REST API', 'Tailwind'],
        experience: [{ title: 'Développeur React Senior', company: 'Startup Fintech', period: '2022 - présent' }],
        education: [{ degree: 'Diplôme Ingénieur', school: 'École Centrale Paris', year: '2021' }],
        languages: ['Français', 'Anglais'],
        atsScore: 78,
        atsKeywordsFound: ['expérience', 'compétences', 'formation', 'projet'],
        atsMissing: ['résultat', 'performance'],
        yearsExperience: 5,
      }
      setParsed(mock)
      setCV(mock, 'Thomas_Martin_CV_mock.pdf')
    }, 2200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2 font-bold text-primary text-xl mb-10">
        <Zap size={24} />
        JobCopilot
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${i <= step ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                i < step ? 'bg-primary text-white' : i === step ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className={`w-8 h-px transition-colors duration-500 ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-8 w-full max-w-lg">

        {/* ── Step 0 : Upload ── */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Uploadez votre CV</h2>
            <p className="text-gray-500 mb-5 text-sm">PDF ou DOCX • Max 10 MB • Analyse réelle du contenu</p>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                  <button onClick={useMockData} className="underline text-red-600 text-xs mt-1">
                    Utiliser un CV mock à la place →
                  </button>
                </div>
              </div>
            )}

            {analysisStep >= 0 ? (
              /* Animated progress */
              <div className="py-6">
                <div className="flex justify-center mb-6">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <circle
                        cx="32" cy="32" r="28" fill="none" stroke="#6366f1" strokeWidth="4"
                        strokeDasharray={`${((analysisStep + 1) / ANALYSIS_STEPS.length) * 175.9} 175.9`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <Zap size={20} className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400 mb-4 font-mono">{fileName}</p>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((s, i) => (
                    <div key={s.label} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      i < analysisStep ? 'text-green-600' : i === analysisStep ? 'text-primary font-medium' : 'text-gray-300'
                    }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        i < analysisStep ? 'bg-green-100' : i === analysisStep ? 'bg-primary/10' : 'bg-gray-100'
                      }`}>
                        {i < analysisStep
                          ? <CheckCircle size={10} />
                          : i === analysisStep
                          ? <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse block" />
                          : null}
                      </div>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                >
                  <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-medium text-gray-700 mb-1">Glissez votre CV ici</p>
                  <p className="text-sm text-gray-400 mb-3">ou cliquez pour parcourir</p>
                  <p className="text-xs text-gray-300">PDF ou DOCX • Votre fichier est analysé localement</p>
                </div>
                <button onClick={useMockData} className="w-full mt-3 text-xs text-gray-400 hover:text-primary transition-colors">
                  Pas de CV sous la main ? → Utiliser un exemple mock
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 1 : Results ── */}
        {step === 1 && parsed && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle size={22} className="text-green-500" />
              <h2 className="text-xl font-bold text-gray-900">CV analysé !</h2>
              <span className="text-xs text-gray-400 font-mono ml-auto">{fileName}</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-4">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{parsed.name}</p>
                  <p className="text-xs text-gray-500">{parsed.email}{parsed.phone ? ` • ${parsed.phone}` : ''}</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">
                  COMPÉTENCES DÉTECTÉES ({parsed.skills.length})
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {visibleSkills.map(skill => (
                    <span key={skill} className="badge bg-primary/10 text-primary">{skill}</span>
                  ))}
                </div>
              </div>

              {/* Experience */}
              {parsed.experience.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">EXPÉRIENCE</p>
                  {parsed.experience.slice(0, 2).map((e, i) => (
                    <p key={i} className="text-sm text-gray-700">
                      <span className="font-medium">{e.title}</span>
                      {e.company ? ` — ${e.company}` : ''}
                      {e.period ? <span className="text-gray-400"> ({e.period})</span> : ''}
                    </p>
                  ))}
                  {parsed.yearsExperience > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{parsed.yearsExperience} ans d'expérience estimés</p>
                  )}
                </div>
              )}

              {/* Languages */}
              {parsed.languages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold">LANGUES :</span>
                  <span>{parsed.languages.join(' • ')}</span>
                </div>
              )}

              {/* ATS Score */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">SCORE ATS</p>
                    {parsed.sector && parsed.sector !== 'generic' && (
                      <p className="text-[10px] text-primary">
                        Calculé pour le secteur {parsed.sector === 'transport' ? 'Transport & Logistique' : parsed.sector === 'tech' ? 'Développement / Tech' : parsed.sector}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${atsScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {atsScore}/100
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${atsScore >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${atsScore}%` }}
                  />
                </div>
                {parsed.atsMissing.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Mots-clés manquants : {parsed.atsMissing.join(', ')}
                  </p>
                )}
              </div>
            </div>

            <button onClick={() => setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
              Continuer <ChevronRight size={16} />
            </button>
            <button
              onClick={downloadCVDocx}
              disabled={downloadingDocx}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {downloadingDocx ? (
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Télécharger mon CV Word (.docx)
            </button>
          </div>
        )}

        {/* ── Step 2 : Preferences ── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vos préférences</h2>
            <p className="text-gray-500 mb-6 text-sm">Pour affiner les recommandations d'offres</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Poste recherché</label>
                <input defaultValue={parsed?.experience[0]?.title || ''} placeholder="Ex: Développeur React Senior" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Localisation</label>
                  <input defaultValue="Paris, France" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Salaire cible</label>
                  <input defaultValue="65 000 €/an" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Type de contrat</label>
                <div className="flex gap-2 flex-wrap">
                  {['CDI', 'CDD', 'Freelance', 'Remote uniquement'].map(t => (
                    <button key={t} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      t === 'CDI' || t === 'Remote uniquement'
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(3)} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
              Trouver mes offres <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 3 : Ready ── */}
        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tout est prêt !</h2>
            <p className="text-gray-500 mb-1">
              Nous avons trouvé <span className="font-bold text-primary">47 offres</span> correspondant à votre profil.
            </p>
            {parsed && parsed.skills.length > 0 && (
              <p className="text-xs text-gray-400 mb-6">
                Basé sur {parsed.skills.length} compétences détectées dans votre CV
              </p>
            )}
            <button onClick={() => navigate('/dashboard')} className="btn-primary px-8 py-3 text-base flex items-center gap-2 mx-auto">
              Accéder à mon dashboard <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
