import { useState } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import { Lock, Zap, Check } from 'lucide-react'

const FEATURES = [
  'Recherche IA automatique d\'offres',
  'Tableau de bord Kanban',
  'Matching CV ↔ offres en temps réel',
  'Candidature assistée par IA',
  'Optimisation ATS',
]

interface Props {
  onClose?: () => void
}

export default function Paywall({ onClose }: Props) {
  const { startCheckout, cvEmail } = useSubscription()
  const [email, setEmail] = useState(cvEmail)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Entrez une adresse email valide.')
      return
    }
    setError('')
    setLoading(true)
    await startCheckout(trimmed)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Fonctionnalité Premium</h2>
        <p className="text-gray-500 text-sm mb-5">
          La recherche automatique d'offres est disponible avec l'abonnement JobCopilot Pro.
        </p>
        <ul className="text-left text-sm text-gray-600 mb-5 space-y-2">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2">
              <Check size={14} className="text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {error && <p className="text-xs text-red-500 mb-2 text-left">{error}</p>}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full mt-3 py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Zap size={16} />
          }
          S'abonner — 9,99 €/mois
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Retour
          </button>
        )}
      </div>
    </div>
  )
}
