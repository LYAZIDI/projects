import { Request, Response, NextFunction } from 'express'
import { isSubscribed } from '../services/subscriptionService'
import { loadProfile } from '../services/profileService'

export async function requireSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await loadProfile()
    const email = profile?.cv?.email

    if (!email) {
      return res.status(402).json({
        error: 'Abonnement requis',
        paywall: true,
        message: 'Votre CV ne contient pas d\'email. Ajoutez-le et ré-uploadez votre CV.',
      })
    }

    const subscribed = await isSubscribed(email)
    if (!subscribed) {
      return res.status(402).json({
        error: 'Abonnement requis',
        paywall: true,
        email,
        message: 'Abonnez-vous pour accéder à la recherche automatique d\'offres.',
      })
    }

    next()
  } catch (err: any) {
    console.error('[requireSubscription] Error:', err.message)
    // Let through on DB errors to avoid blocking paying users
    next()
  }
}
