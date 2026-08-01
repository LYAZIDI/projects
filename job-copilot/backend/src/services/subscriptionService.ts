import pool from '../db/pgClient'

export interface Subscription {
  email: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string
  currentPeriodEnd: Date | null
}

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      email                  TEXT PRIMARY KEY,
      stripe_customer_id     TEXT,
      stripe_subscription_id TEXT,
      status                 TEXT NOT NULL DEFAULT 'inactive',
      current_period_end     TIMESTAMPTZ,
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export async function getSubscription(email: string): Promise<Subscription | null> {
  await ensureTable()
  const { rows } = await pool.query('SELECT * FROM subscriptions WHERE email = $1', [email.toLowerCase()])
  if (!rows[0]) return null
  return {
    email: rows[0].email,
    stripeCustomerId: rows[0].stripe_customer_id,
    stripeSubscriptionId: rows[0].stripe_subscription_id,
    status: rows[0].status,
    currentPeriodEnd: rows[0].current_period_end,
  }
}

export async function isSubscribed(email: string): Promise<boolean> {
  const sub = await getSubscription(email.toLowerCase())
  if (!sub || sub.status !== 'active') return false
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false
  return true
}

export async function upsertSubscription(data: {
  email: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  status: string
  currentPeriodEnd?: Date | null
}): Promise<void> {
  await ensureTable()
  await pool.query(`
    INSERT INTO subscriptions
      (email, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (email) DO UPDATE SET
      stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
      status                 = EXCLUDED.status,
      current_period_end     = EXCLUDED.current_period_end,
      updated_at             = NOW()
  `, [
    data.email.toLowerCase(),
    data.stripeCustomerId ?? null,
    data.stripeSubscriptionId ?? null,
    data.status,
    data.currentPeriodEnd ?? null,
  ])
}
