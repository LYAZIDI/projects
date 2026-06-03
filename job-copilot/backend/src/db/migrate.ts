/**
 * Migration script — crée les tables si elles n'existent pas.
 * Usage : npx tsx src/db/migrate.ts
 */
import fs from 'fs'
import path from 'path'
import pool from './pgClient'

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  const client = await pool.connect()
  try {
    console.log('[migrate] Running schema...')
    await client.query(sql)
    console.log('[migrate] Done — tables created (if not exists).')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('[migrate] FATAL:', err.message)
  process.exit(1)
})
