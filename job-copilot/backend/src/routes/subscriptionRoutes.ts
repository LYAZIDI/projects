import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { getSubscription, isSubscribed, upsertSubscription } from '../services/subscriptionService'

const router = Router()

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-07-29.dahlia' as any,
  })
}

// In Stripe API 2026-07-29, current_period_end moved to SubscriptionItem
function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const ts = (sub as any).current_period_end ?? sub.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000) : null
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://job-copilot-eosin.vercel.app'

// POST /api/subscription/checkout
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email requis' })
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY non configurée' })
    if (!process.env.STRIPE_PRICE_ID) return res.status(500).json({ error: 'STRIPE_PRICE_ID non configurée' })

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/onboarding`,
      metadata: { email },
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('[Subscription] Checkout error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/subscription/status?email=...
router.get('/status', async (req: Request, res: Response) => {
  const email = req.query.email as string
  if (!email) return res.status(400).json({ error: 'Email requis' })

  try {
    const subscribed = await isSubscribed(email)
    const sub = await getSubscription(email)
    return res.json({
      subscribed,
      status: sub?.status ?? 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/subscription/activate — called from success page right after checkout
router.post('/activate', async (req: Request, res: Response) => {
  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' })
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY non configurée' })

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items'],
    })

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Paiement non complété' })
    }

    const email = (session.metadata?.email || session.customer_email || '').toLowerCase()
    if (!email) return res.status(400).json({ error: 'Email introuvable dans la session Stripe' })

    const subRaw = session.subscription
    const sub: Stripe.Subscription | null = typeof subRaw === 'string'
      ? await stripe.subscriptions.retrieve(subRaw, { expand: ['items'] })
      : subRaw as Stripe.Subscription | null

    await upsertSubscription({
      email,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
      stripeSubscriptionId: sub?.id ?? null,
      status: 'active',
      currentPeriodEnd: sub ? getPeriodEnd(sub) : null,
    })

    return res.json({ subscribed: true, email })
  } catch (err: any) {
    console.error('[Subscription] Activate error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/subscription/webhook  (raw body — see app.ts)
router.post('/webhook', async (req: Request, res: Response) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe non configuré' })
  }

  const stripe = getStripe()
  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody ?? req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Webhook] Signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const email = (session.metadata?.email || session.customer_email || '').toLowerCase()
        if (email) {
          const subRaw = session.subscription
          const sub: Stripe.Subscription | null = typeof subRaw === 'string'
            ? await stripe.subscriptions.retrieve(subRaw, { expand: ['items'] })
            : subRaw as Stripe.Subscription | null
          await upsertSubscription({
            email,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            stripeSubscriptionId: sub?.id ?? null,
            status: 'active',
            currentPeriodEnd: sub ? getPeriodEnd(sub) : null,
          })
          console.log(`[Webhook] Subscription activated: ${email}`)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(sub.customer as string)
        const email = (customer as Stripe.Customer).email?.toLowerCase()
        if (email) {
          const status = sub.status === 'active' ? 'active'
            : sub.status === 'canceled' ? 'canceled'
            : 'past_due'
          await upsertSubscription({
            email,
            stripeSubscriptionId: sub.id,
            status,
            currentPeriodEnd: getPeriodEnd(sub),
          })
          console.log(`[Webhook] Subscription ${status}: ${email}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customer = await stripe.customers.retrieve(invoice.customer as string)
        const email = (customer as Stripe.Customer).email?.toLowerCase()
        if (email) {
          await upsertSubscription({ email, status: 'past_due' })
        }
        break
      }
    }
  } catch (err: any) {
    console.error('[Webhook] Handler error:', err.message)
  }

  return res.json({ received: true })
})

export default router
