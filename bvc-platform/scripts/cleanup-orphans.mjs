/**
 * Supprime les titres qui ne sont plus dans le scanner TradingView.
 * On garde uniquement les 77 tickers actifs retournés par TradingView.
 */
import axios from 'axios';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '..', '.env.local'), 'utf8')
    .split('\n').filter(l => /^[A-Z_]+=/.test(l.trim()))
    .map(l => { const eq = l.indexOf('='); return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]; })
);

// 1. Récupérer la liste live TradingView
const { data } = await axios.post(
  'https://scanner.tradingview.com/morocco/scan',
  { columns: ['name'], sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' }, range: [0, 200] },
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    },
    timeout: 20000,
  }
);

const liveTickers = new Set(
  (data.data ?? []).map(({ d }) => String(d[0] ?? '').replace('CSEMA:', '').trim()).filter(Boolean)
);
console.log(`TradingView actifs: ${liveTickers.size} tickers`);

// 2. Trouver les orphelins dans la DB
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const { rows: allTickers } = await pool.query(`SELECT ticker FROM bvc.dim_titre ORDER BY ticker`);
const orphans = allTickers.map(r => r.ticker).filter(t => !liveTickers.has(t));
console.log(`Orphelins à supprimer: ${orphans.length}`);
console.log('  ', orphans.join(', '));

if (orphans.length === 0) {
  console.log('Rien à faire.');
  await pool.end();
  process.exit(0);
}

// 3. Supprimer en cascade (fact_cours, fact_indice déjà séparés, dim_fondamentaux, dim_titre)
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Supprimer les cours
  const delCours = await client.query(
    `DELETE FROM bvc.fact_cours WHERE ticker = ANY($1)`, [orphans]
  );
  console.log(`\nfact_cours supprimés: ${delCours.rowCount}`);

  // Supprimer les fondamentaux
  const delFond = await client.query(
    `DELETE FROM bvc.dim_fondamentaux WHERE ticker = ANY($1)`, [orphans]
  );
  console.log(`dim_fondamentaux supprimés: ${delFond.rowCount}`);

  // Supprimer les titres
  const delTitre = await client.query(
    `DELETE FROM bvc.dim_titre WHERE ticker = ANY($1)`, [orphans]
  );
  console.log(`dim_titre supprimés: ${delTitre.rowCount}`);

  await client.query('COMMIT');

  // Vérification finale
  const { rows: remaining } = await client.query(`SELECT COUNT(*) AS n FROM bvc.dim_titre`);
  console.log(`\n✅ Base nettoyée — ${remaining[0].n} titres restants`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
await pool.end();
