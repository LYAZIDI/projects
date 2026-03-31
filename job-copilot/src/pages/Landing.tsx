import { Link } from 'react-router-dom'
import { Zap, FileText, Search, Send, BarChart3, Shield, CheckCircle, ArrowRight } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Analyse votre CV', desc: 'Extraction intelligente de vos compétences, expériences et points forts en quelques secondes.' },
  { icon: Search, title: 'Trouve les meilleures offres', desc: 'Matching sémantique avec des milliers d\'offres via les APIs officielles France Travail, Indeed, Adzuna.' },
  { icon: Zap, title: 'Génère votre dossier en 1 clic', desc: 'CV optimisé ATS, lettre de motivation personnalisée, réponses aux formulaires — tout prêt à valider.' },
  { icon: Send, title: 'Vous restez aux commandes', desc: 'JobCopilot prépare tout. Vous ouvrez la plateforme, collez les infos et cliquez "Postuler". C\'est tout.' },
  { icon: BarChart3, title: 'Tableau de bord candidatures', desc: 'Suivi Kanban, rappels automatiques, statistiques de taux de réponse.' },
  { icon: Shield, title: '100% légal & RGPD', desc: 'Aucune automatisation, aucun bot, aucun scraping illégal. Conforme RGPD, données hébergées en Europe.' },
]

const steps = [
  { n: '01', title: 'Uploadez votre CV', desc: 'PDF ou DOCX — analyse en 10 secondes' },
  { n: '02', title: 'Choisissez une offre', desc: 'Score de compatibilité affiché pour chaque offre' },
  { n: '03', title: 'Générez votre dossier', desc: 'CV optimisé + lettre + réponses formulaire' },
  { n: '04', title: 'Postulez en 2 minutes', desc: 'Copiez-collez et validez sur la plateforme' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary text-lg">
            <Zap size={22} />
            JobCopilot
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-secondary">Se connecter</Link>
            <Link to="/onboarding" className="btn-primary">Essai gratuit</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
          <Zap size={14} />
          95% du travail automatisé • 100% légal
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Postulez 10× plus vite.<br />
          <span className="text-primary">Sans jamais tricher.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          JobCopilot analyse votre CV, trouve les meilleures offres, génère votre lettre et vos réponses. Vous n'avez plus qu'à valider et cliquer.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/onboarding" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary-dark transition-colors flex items-center gap-2">
            Commencer gratuitement <ArrowRight size={18} />
          </Link>
          <Link to="/dashboard" className="px-6 py-3 border border-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors">
            Voir la démo →
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">Gratuit • Pas de carte bancaire • RGPD compliant</p>

        {/* Mock app preview */}
        <div className="mt-16 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-gray-50 text-left">
          <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-xs ml-3">jobcopilot.app/dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-4 gap-3 h-48">
            {['À postuler', 'Postulé', 'Entretien', 'Offre'].map((col, i) => (
              <div key={col} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className={`text-xs font-semibold mb-2 ${['text-blue-600','text-yellow-600','text-purple-600','text-green-600'][i]}`}>{col}</div>
                {[1,2].slice(0, i === 0 ? 2 : i === 1 ? 2 : i === 2 ? 1 : 1).map(k => (
                  <div key={k} className="bg-gray-50 rounded p-2 mb-1.5 text-xs">
                    <div className="font-medium text-gray-800 truncate">{['Qonto','Doctolib','BlaBlaCar','Alan'][i]}</div>
                    <div className="text-gray-400 truncate">{['React Senior','Frontend Eng.','Tech Lead','RN Dev'][i]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid grid-cols-4 gap-6">
            {steps.map(s => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">{s.n}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
        <div className="grid grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="card p-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Tarifs simples</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { name: 'Gratuit', price: '0€', period: '/mois', features: ['5 candidatures/mois', '1 CV analysé', 'Offres recommandées', 'Génération lettre'], cta: 'Commencer', primary: false },
              { name: 'Pro', price: '19€', period: '/mois', features: ['Candidatures illimitées', 'CVs illimités', 'Extension navigateur', 'Export PDF', 'Statistiques avancées', 'Rappels email'], cta: 'Essai 7 jours', primary: true },
              { name: 'Boost', price: '49€', period: '/mois', features: ['Tout le plan Pro', 'Révision CV humaine', 'Coaching entretien IA', 'Support prioritaire'], cta: 'Contacter', primary: false },
            ].map(p => (
              <div key={p.name} className={`card p-6 ${p.primary ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                {p.primary && <div className="badge bg-primary text-white mb-3">Populaire</div>}
                <h3 className="font-bold text-xl mb-1">{p.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">{p.price}<span className="text-sm font-normal text-gray-500">{p.period}</span></div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/onboarding" className={p.primary ? 'btn-primary w-full text-center block' : 'btn-secondary w-full text-center block'}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        <p>© 2026 JobCopilot — RGPD compliant • Données hébergées en Europe</p>
      </footer>
    </div>
  )
}
