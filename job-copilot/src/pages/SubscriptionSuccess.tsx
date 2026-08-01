import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../context/SubscriptionContext'

const API = ''

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const { checkStatus } = useSubscription()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (!sessionId) { navigate('/onboarding'); return }

    fetch(`${API}/api/subscription/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(async data => {
        if (data.subscribed) {
          await checkStatus()
          setStatus('success')
          setTimeout(() => navigate('/onboarding'), 2500)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Activation de votre abonnement…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Abonnement activé !</h2>
            <p className="text-gray-500 text-sm">Redirection vers votre espace…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur d'activation</h2>
            <p className="text-gray-500 text-sm mb-6">
              Si vous avez été débité, contactez le support. Sinon, réessayez.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Retour
            </button>
          </>
        )}
      </div>
    </div>
  )
}
