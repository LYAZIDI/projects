/**
 * Sync direct: TradingView → Neon (sans passer par le dev server)
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

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

const TV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Origin': 'https://www.tradingview.com',
  'Referer': 'https://www.tradingview.com/',
};

// ── 1. Fetch all stocks ──────────────────────────────────────────────────────
console.log('Fetching TradingView scanner...');
const { data: scanData } = await axios.post(
  'https://scanner.tradingview.com/morocco/scan',
  {
    columns: ['name','description','close','change','change_abs','volume','market_cap_basic','open','high','low','Perf.YTD','sector'],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 200],
  },
  { headers: TV_HEADERS, timeout: 20000 }
);

const date = new Date().toISOString().split('T')[0];
const cotations = (scanData.data ?? []).map(({ d }) => {
  const [name, desc, close, change, , volume, mktcap, open, high, low, ytd, sector] = d;
  const ticker = String(name ?? '').replace('CSEMA:', '').trim();
  if (!ticker) return null;
  return {
    ticker, nom: String(desc ?? ticker),
    secteur:       typeof sector === 'string' && sector ? sector : null,
    cloture:       typeof close  === 'number' ? close  : null,
    variation_pct: typeof change === 'number' ? change : null,
    volume:        typeof volume === 'number' ? Math.round(volume) : null,
    capitaux:      (typeof close === 'number' && typeof volume === 'number') ? close * volume : null,
    ouverture:     typeof open   === 'number' ? open   : null,
    haut:          typeof high   === 'number' ? high   : null,
    bas:           typeof low    === 'number' ? low    : null,
    ytd_pct:       typeof ytd    === 'number' ? ytd    : null,
    market_cap:    typeof mktcap === 'number' ? mktcap : null,
  };
}).filter(Boolean);

console.log(`Got ${cotations.length} titres from TradingView`);

// ── 2. Fetch indices ─────────────────────────────────────────────────────────
let indices = [];
try {
  const { data: idxData } = await axios.post(
    'https://scanner.tradingview.com/morocco/scan',
    {
      columns: ['name', 'close', 'change'],
      symbols: { tickers: ['CSEMA:MASI', 'CSEMA:MASIR'] },
      range: [0, 5],
    },
    { headers: TV_HEADERS, timeout: 15000 }
  );
  indices = (idxData.data ?? []).map(({ d }) => ({
    indice:        String(d[0] ?? '').replace('CSEMA:', ''),
    valeur:        typeof d[1] === 'number' ? d[1] : null,
    variation_pct: typeof d[2] === 'number' ? d[2] : null,
  }));
  console.log(`Got ${indices.length} indices from TradingView`);
} catch (e) {
  console.warn('Indices non disponibles:', e.message);
}

// ── 3. Upsert into Neon ──────────────────────────────────────────────────────
const client = await pool.connect();
let inserted = 0;
try {
  await client.query('BEGIN');
  for (const c of cotations) {
    await client.query(`
      INSERT INTO bvc.dim_titre (ticker, nom, secteur)
      VALUES ($1, $2, $3)
      ON CONFLICT (ticker) DO UPDATE SET
        nom     = EXCLUDED.nom,
        secteur = COALESCE(bvc.dim_titre.secteur, EXCLUDED.secteur),
        updated_at = NOW()
    `, [c.ticker, c.nom, c.secteur]);

    await client.query(`
      INSERT INTO bvc.fact_cours
        (ticker, date_value, cloture, variation_pct, volume, capitaux, ouverture, haut, bas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (ticker, date_value) DO UPDATE SET
        cloture = EXCLUDED.cloture, variation_pct = EXCLUDED.variation_pct,
        volume  = EXCLUDED.volume,  capitaux      = EXCLUDED.capitaux,
        ouverture = EXCLUDED.ouverture, haut = EXCLUDED.haut, bas = EXCLUDED.bas
    `, [c.ticker, date, c.cloture, c.variation_pct, c.volume, c.capitaux, c.ouverture, c.haut, c.bas]);

    if (c.market_cap != null || c.ytd_pct != null) {
      await client.query(`
        INSERT INTO bvc.dim_fondamentaux (ticker, market_cap, ytd_tv_pct)
        VALUES ($1, $2, $3)
        ON CONFLICT (ticker) DO UPDATE SET
          market_cap = COALESCE(EXCLUDED.market_cap, bvc.dim_fondamentaux.market_cap),
          ytd_tv_pct = COALESCE(EXCLUDED.ytd_tv_pct,  bvc.dim_fondamentaux.ytd_tv_pct),
          updated_at = NOW()
      `, [c.ticker, c.market_cap, c.ytd_pct]);
    }
    inserted++;
  }

  for (const idx of indices) {
    await client.query(`
      INSERT INTO bvc.fact_indice (indice, date_value, valeur, variation_pct)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (indice, date_value) DO UPDATE SET
        valeur = EXCLUDED.valeur, variation_pct = EXCLUDED.variation_pct
    `, [idx.indice, date, idx.valeur, idx.variation_pct]);
  }

  await client.query('COMMIT');
  console.log(`\n✅ Sync terminé — ${inserted} titres, ${indices.length} indices (${date})`);

  // Show sample
  const { rows } = await client.query(`
    SELECT c.ticker, t.nom, c.cloture, c.variation_pct, f.ytd_tv_pct, f.market_cap
    FROM bvc.fact_cours c
    JOIN bvc.dim_titre t ON t.ticker = c.ticker
    LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = c.ticker
    WHERE c.date_value = $1
    ORDER BY f.market_cap DESC NULLS LAST
    LIMIT 10
  `, [date]);
  console.log('\nTop 10 par capitalisation:');
  rows.forEach(r => console.log(
    `  ${r.ticker.padEnd(6)} | ${String(r.nom).substring(0,28).padEnd(28)} | ${String(r.cloture).padStart(8)} MAD | ${r.variation_pct > 0 ? '+' : ''}${parseFloat(r.variation_pct).toFixed(2)}% | YTD ${parseFloat(r.ytd_tv_pct ?? 0).toFixed(2)}%`
  ));
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}

await pool.end();
