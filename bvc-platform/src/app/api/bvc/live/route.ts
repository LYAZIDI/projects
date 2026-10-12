import { NextResponse } from 'next/server';
import { bvcApi, BvcRec } from '@/lib/bvc-client';
import pool from '@/lib/db';

const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => typeof v === 'number' ? v : null;
const lbl = (v: unknown) => ((v as BvcRec)?.fr as string ?? '');

function mapTicker(item: BvcRec) {
  return { symbol: str(item.symbol), price: num(item.price), change_pct: num(item.change_pct), label: lbl(item.label) };
}
function mapTx(tx: BvcRec) {
  return { symbol: str(tx.symbol), price: num(tx.price), quantity: num(tx.quantity), volume: num(tx.volume), time: str(tx.time), label: lbl(tx.label), market: lbl(tx.market_label) };
}

const EMPTY = {
  session: {}, ticker: [], movers: { gainers: [], losers: [], futures_gainers: [] },
  transactions: { central: [], blocs: [], off_book: [] }, futures: [], indices: [],
  cashVolume: null as number | null, futuresVolume: null as number | null, heatmap: [],
};

function buildOverview(ov: BvcRec) {
  const movers = (ov.movers ?? {}) as BvcRec;
  const txs    = (ov.transactions ?? {}) as BvcRec;
  return {
    session: ov.session ?? {},
    ticker:  ((ov.ticker as BvcRec)?.items as BvcRec[] ?? []).map(mapTicker),
    movers: {
      gainers:         ((movers.cash_gainers    as BvcRec[]) ?? []).map(mapTicker),
      losers:          ((movers.cash_losers     as BvcRec[]) ?? []).map(mapTicker),
      futures_gainers: ((movers.futures_gainers as BvcRec[]) ?? []).map(mapTicker),
    },
    transactions: {
      central:  ((txs.central  as BvcRec[]) ?? []).map(mapTx),
      blocs:    ((txs.blocs    as BvcRec[]) ?? []).map(mapTx),
      off_book: ((txs.off_book as BvcRec[]) ?? []).map(mapTx),
    },
    futures: ((ov.futures as BvcRec[]) ?? []).map(f => ({ code: str(f.code), name: str(f.name) })),
  };
}

function buildIndices(idx: BvcRec) {
  // API may return { indices: { principaux: [...] } } or { principaux: [...] } directly
  const principaux = ((idx.indices as BvcRec)?.principaux as BvcRec[]) ?? (idx.principaux as BvcRec[]) ?? [];
  return principaux.map(i => ({
    code:       str(i.code),
    label:      lbl(i.label),
    value:      num(i.value),
    change_pct: num(i.change_pct),
    change_ytd: num(i.change_ytd),
    high:       num(i.high ?? i.plus_haut ?? i.plusHaut ?? i.high_day),
    low:        num(i.low  ?? i.plus_bas  ?? i.plusBas  ?? i.low_day),
    previous:   num(i.previous ?? i.cours_veille ?? i.prev_close ?? i.veille),
  }));
}

function buildVolumes(tx: BvcRec) {
  // API may return full object or transactions_page directly
  const tp = (tx.transactions_page ?? tx) as BvcRec;
  return {
    cashVolume:    typeof tp.cash_volume    === 'number' ? tp.cash_volume    : null,
    futuresVolume: typeof tp.futures_volume === 'number' ? tp.futures_volume : null,
  };
}

async function fetchHeatmapData(): Promise<{ secteur: string; ticker: string; nom: string; variation: number | null }[]> {
  try {
    const { rows } = await pool.query<{ secteur: string; ticker: string; nom: string; variation: string | null }>(`
      SELECT dt.secteur, dt.ticker, COALESCE(dt.nom, dt.ticker) AS nom, vc.variation
      FROM bvc.dim_titre dt
      JOIN bvc.v_derniere_cotation vc ON dt.ticker = vc.ticker
      WHERE dt.secteur IS NOT NULL
      ORDER BY dt.secteur, ABS(COALESCE(vc.variation, 0)) DESC
    `);
    return rows.map(r => ({
      secteur:   r.secteur,
      ticker:    r.ticker,
      nom:       r.nom,
      variation: r.variation != null ? parseFloat(r.variation) : null,
    }));
  } catch { return []; }
}

// Unwrap optional live_market wrapper that the Drupal API sometimes adds
function unwrap(raw: BvcRec): BvcRec {
  return ((raw as BvcRec).live_market ?? raw) as BvcRec;
}

export async function GET() {
  try {
    const [ovRaw, idxRaw, txRaw, heatmap] = await Promise.all([
      bvcApi.overview(),
      bvcApi.indices(),
      bvcApi.transactions(),
      fetchHeatmapData(),
    ]);

    const ov  = unwrap(ovRaw  as BvcRec);
    const idx = unwrap(idxRaw as BvcRec);
    const tx  = unwrap(txRaw  as BvcRec);

    return NextResponse.json({
      ...buildOverview(ov),
      indices: buildIndices(idx),
      ...buildVolumes(tx),
      heatmap,
    });
  } catch (err) {
    console.error('[BVC live] fetch error:', err);
    return NextResponse.json(EMPTY);
  }
}
