/**
 * Mappe les secteurs TradingView (anglais) vers le français BVC
 * et les applique aux stocks qui n'ont pas encore de secteur.
 */
import pg from 'pg';
import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '..', '.env.local'), 'utf8')
    .split('\n').filter(l => /^[A-Z_]+=/.test(l.trim()))
    .map(l => { const eq = l.indexOf('='); return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]; })
);

const TV_TO_FR = {
  'Finance':                    'Bancaires & Finance',
  'Non-Energy Minerals':        'Mines & Matériaux',
  'Communications':             'Télécommunications',
  'Transportation':             'Transport & Logistique',
  'Utilities':                  'Services aux collectivités',
  'Industrial Services':        'Services Industriels',
  'Consumer Durables':          'Biens de consommation',
  'Consumer Non-Durables':      'Agroalimentaire',
  'Retail Trade':               'Distribution',
  'Health Technology':          'Santé',
  'Health Services':            'Santé',
  'Producer Manufacturing':     'Industrie',
  'Process Industries':         'Chimie & Industries',
  'Electronic Technology':      'Technologie',
  'Technology Services':        'Technologie',
  'Energy Minerals':            'Énergie & Mines',
  'Distribution Services':      'Distribution',
  'Commercial Services':        'Services Commerciaux',
  'Real Estate':                'Immobilier',
};

// Récupérer les secteurs depuis TradingView
const { data } = await axios.post(
  'https://scanner.tradingview.com/morocco/scan',
  {
    columns: ['name', 'sector'],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 200],
  },
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

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const client = await pool.connect();

try {
  let updated = 0;
  await client.query('BEGIN');

  for (const { d } of data.data ?? []) {
    const ticker  = String(d[0] ?? '').replace('CSEMA:', '').trim();
    const tvSec   = typeof d[1] === 'string' ? d[1] : null;
    const frSec   = tvSec ? (TV_TO_FR[tvSec] ?? tvSec) : null;

    if (!ticker || !frSec) continue;

    const result = await client.query(`
      UPDATE bvc.dim_titre
      SET secteur = $1, updated_at = NOW()
      WHERE ticker = $2 AND secteur IS NULL
    `, [frSec, ticker]);

    if (result.rowCount > 0) {
      console.log(`  ${ticker.padEnd(6)} : null → ${frSec}`);
      updated++;
    }
  }

  await client.query('COMMIT');
  console.log(`\n✅ ${updated} secteurs mis à jour`);

  // Vérification
  const { rows } = await client.query(`
    SELECT secteur, COUNT(*) AS n
    FROM bvc.dim_titre
    GROUP BY secteur
    ORDER BY n DESC
  `);
  console.log('\nRépartition finale:');
  rows.forEach(r => console.log(`  ${String(r.secteur ?? 'null').padEnd(35)} ${r.n}`));
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
await pool.end();
