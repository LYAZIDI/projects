import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter(l => /^[A-Z_]+=/.test(l.trim()))
    .map(l => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
    })
);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

const migrations = [
  // Ajouter ytd_tv_pct dans dim_fondamentaux (YTD direct TradingView)
  `ALTER TABLE bvc.dim_fondamentaux ADD COLUMN IF NOT EXISTS ytd_tv_pct NUMERIC(8,4)`,
];

for (const sql of migrations) {
  console.log('Running:', sql.substring(0, 60) + '...');
  await pool.query(sql);
  console.log('  ✓ Done');
}

await pool.end();
console.log('\nMigrations terminées.');
