import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useCV } from './CVContext'

const API = ''

interface SubscriptionCtx {
  isSubscribed: boolean
  loading: boolean
  startCheckout: (email: string) => Promise<void>
  checkStatus: (email?: string) => Promise<void>
  cvEmail: string
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  isSubscribed: false,
  loading: true,
  startCheckout: async () => {},
  checkStatus: async () => {},
  cvEmail: '',
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { cv } = useCV()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkStatus(emailOverride?: string) {
    const email = emailOverride ?? cv?.email
    if (!email) { setLoading(false); return }
    try {
      const res = await fetch(`${API}/api/subscription/status?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setIsSubscribed(data.subscribed === true)
    } catch {
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { checkStatus() }, [cv?.email])

  async function startCheckout(email: string) {
    try {
      const res = await fetch(`${API}/api/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erreur lors de la création de la session de paiement.')
      }
    } catch {
      alert('Erreur réseau. Réessayez.')
    }
  }

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, loading, startCheckout, checkStatus, cvEmail: cv?.email ?? '' }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
