import axios from 'axios';
import pool from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CotationRaw {
  ticker:        string;
  nom:           string;
  secteur:       string | null;
  cloture:       number | null;
  variation_pct: number | null;
  volume:        number | null;
  capitaux:      number | null;
  ouverture:     number | null;
  haut:          number | null;
  bas:           number | null;
  ytd_pct:       number | null;
  market_cap:    number | null;
}

// ── TradingView Scanner — source principale ───────────────────────────────────

const TV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Origin': 'https://www.tradingview.com',
  'Referer': 'https://www.tradingview.com/',
};

const SCANNER_COLUMNS = [
  'name',           // 0  ticker
  'description',    // 1  nom complet
  'close',          // 2  cours clôture
  'change',         // 3  variation % J
  'change_abs',     // 4  variation absolue
  'volume',         // 5  volume titres
  'market_cap_basic', // 6 capitalisation boursière
  'open',           // 7  ouverture
  'high',           // 8  haut du jour
  'low',            // 9  bas du jour
  'Perf.YTD',       // 10 performance YTD %
  'sector',         // 11 secteur
];

// Tickers hors scanner général mais accessibles via symbols mode
const EXTRA_TICKERS = ['CMT'];

export async function scrapeCotations(): Promise<CotationRaw[]> {
  const [scanRes, extraRes] = await Promise.all([
    // Scanner général : 77 titres les plus actifs
    axios.post(
      'https://scanner.tradingview.com/morocco/scan',
      { columns: SCANNER_COLUMNS, sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' }, range: [0, 200] },
      { headers: TV_HEADERS, timeout: 20000 }
    ),
    // Tickers supplémentaires hors scanner
    axios.post(
      'https://scanner.tradingview.com/morocco/scan',
      { columns: SCANNER_COLUMNS, symbols: { tickers: EXTRA_TICKERS.map(t => `CSEMA:${t}`) }, range: [0, 20] },
      { headers: TV_HEADERS, timeout: 15000 }
    ).catch(() => ({ data: { data: [] } })),
  ]);

  const allItems = [
    ...(scanRes.data.data ?? []),
    ...(extraRes.data.data ?? []),
  ];
  const seen = new Set<string>();
  const { data } = { data: { data: allItems.filter(item => {
    const t = String((item.d as unknown[])[0] ?? '').replace('CSEMA:', '').trim();
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  }) } };

  return (data.data ?? []).map((item: { s: string; d: unknown[] }) => {
    const [name, desc, close, change, , volume, mktcap, open, high, low, ytd, sector] = item.d as (number | string | null)[];
    const ticker = String(name ?? '').replace('CSEMA:', '').trim();
    if (!ticker) return null;

    return {
      ticker,
      nom:           String(desc ?? ticker),
      secteur:       typeof sector === 'string' && sector ? sector : null,
      cloture:       typeof close    === 'number' ? close    : null,
      variation_pct: typeof change   === 'number' ? parseFloat(change.toFixed(4)) : null,
      volume:        typeof volume   === 'number' ? Math.round(volume) : null,
      capitaux:      typeof close === 'number' && typeof volume === 'number' ? close * volume : null,
      ouverture:     typeof open     === 'number' ? open     : null,
      haut:          typeof high     === 'number' ? high     : null,
      bas:           typeof low      === 'number' ? low      : null,
      ytd_pct:       typeof ytd      === 'number' ? parseFloat(ytd.toFixed(4)) : null,
      market_cap:    typeof mktcap   === 'number' ? mktcap   : null,
    } satisfies CotationRaw;
  }).filter(Boolean) as CotationRaw[];
}

// ── Indices via TradingView scanner ───────────────────────────────────────────

export async function scrapeIndices(): Promise<Array<{
  indice: string; valeur: number | null; variation_pct: number | null;
}>> {
  try {
    const { data } = await axios.post(
      'https://scanner.tradingview.com/morocco/scan',
      {
        columns: ['name', 'close', 'change'],
        symbols: { tickers: ['CSEMA:MASI', 'CSEMA:MASIR', 'CSEMA:MASI20'] },
        range: [0, 10],
      },
      { headers: TV_HEADERS, timeout: 15000 }
    );

    const LABEL_MAP: Record<string, string> = {
      'MASI': 'MASI', 'MASIR': 'MASIR', 'MASI20': 'MASI 20',
    };

    return (data.data ?? []).map((item: { s: string; d: (number | string | null)[] }) => {
      const ticker = String(item.d[0] ?? '').split(':').pop() ?? '';
      return {
        indice:        LABEL_MAP[ticker] ?? ticker,
        valeur:        typeof item.d[1] === 'number' ? item.d[1] : null,
        variation_pct: typeof item.d[2] === 'number' ? parseFloat((item.d[2] as number).toFixed(4)) : null,
      };
    });
  } catch {
    return [];
  }
}

// ── Upsert helpers ────────────────────────────────────────────────────────────

export async function upsertCotations(cotations: CotationRaw[], date: string): Promise<void> {
  if (!cotations.length) return;
  const client = await pool.connect();
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
          cloture       = EXCLUDED.cloture,
          variation_pct = EXCLUDED.variation_pct,
          volume        = EXCLUDED.volume,
          capitaux      = EXCLUDED.capitaux,
          ouverture     = EXCLUDED.ouverture,
          haut          = EXCLUDED.haut,
          bas           = EXCLUDED.bas
      `, [c.ticker, date, c.cloture, c.variation_pct, c.volume, c.capitaux, c.ouverture, c.haut, c.bas]);

      // Mettre à jour market_cap + ytd_pct dans dim_fondamentaux
      if (c.market_cap != null || c.ytd_pct != null) {
        await client.query(`
          INSERT INTO bvc.dim_fondamentaux (ticker, market_cap, ytd_tv_pct)
          VALUES ($1, $2, $3)
          ON CONFLICT (ticker) DO UPDATE SET
            market_cap  = COALESCE(EXCLUDED.market_cap, bvc.dim_fondamentaux.market_cap),
            ytd_tv_pct  = COALESCE(EXCLUDED.ytd_tv_pct,  bvc.dim_fondamentaux.ytd_tv_pct),
            updated_at  = NOW()
        `, [c.ticker, c.market_cap, c.ytd_pct]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertIndices(
  indices: Array<{ indice: string; valeur: number | null; variation_pct: number | null }>,
  date: string,
): Promise<void> {
  for (const idx of indices) {
    await pool.query(`
      INSERT INTO bvc.fact_indice (indice, date_value, valeur, variation_pct)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (indice, date_value) DO UPDATE SET
        valeur = EXCLUDED.valeur, variation_pct = EXCLUDED.variation_pct
    `, [idx.indice, date, idx.valeur, idx.variation_pct]);
  }
}

export async function syncBVC(): Promise<{ titres: number; indices: number; date: string }> {
  const date = new Date().toISOString().split('T')[0];
  const [cotations, indices] = await Promise.all([scrapeCotations(), scrapeIndices()]);
  await Promise.all([
    upsertCotations(cotations, date),
    upsertIndices(indices, date),
  ]);
  return { titres: cotations.length, indices: indices.length, date };
}
