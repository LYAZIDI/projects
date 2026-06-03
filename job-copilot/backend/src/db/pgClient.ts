import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

if (!process.env.DATABASE_URL) {
  console.warn('[DB] DATABASE_URL not set — PostgreSQL features disabled')
}

// Use @neondatabase/serverless in serverless environments (Vercel/Lambda)
// It uses WebSockets instead of TCP, which works with cold starts
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const pool = new NeonPool({
  connectionString: process.env.DATABASE_URL,
  max: 1,                    // 1 connection per Lambda instance
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err: Error) => {
  console.error('[DB] Pool error:', err.message)
})

export default pool
