import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useCV } from './CVContext'

const API = ''

interface SubscriptionCtx {
  isSubscribed: boolean
  loading: boolean
  startCheckout: () => Promise<void>
  checkStatus: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  isSubscribed: false,
  loading: true,
  startCheckout: async () => {},
  checkStatus: async () => {},
})

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { cv } = useCV()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkStatus() {
    const email = cv?.email
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

  async function startCheckout() {
    const email = cv?.email
    if (!email) {
      alert('Votre CV ne contient pas d\'email. Ajoutez votre email dans le CV et ré-uploadez-le.')
      return
    }
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
    <SubscriptionContext.Provider value={{ isSubscribed, loading, startCheckout, checkStatus }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
