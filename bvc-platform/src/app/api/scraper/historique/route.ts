import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import pool from '@/lib/db';

// POST /api/scraper/historique
// Importe l'historique d'un titre via TradingView UDF
// Body: { ticker: 'ATW', days?: 365 }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-scraper-secret');
  if (secret !== process.env.SCRAPER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticker, days = 365 } = await req.json() as { ticker: string; days?: number };
  if (!ticker) return NextResponse.json({ error: 'ticker requis' }, { status: 400 });

  const symbol = `CSEMA:${ticker.toUpperCase()}`;
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;

  try {
    const { data } = await axios.get('https://data.tradingview.com/datafeed/udf/history', {
      params: { symbol, resolution: 'D', from, to },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin':  'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
      },
      timeout: 30000,
    });

    if (data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) {
      return NextResponse.json({ error: 'Pas de données historiques disponibles', status: data.s }, { status: 422 });
    }

    const { t: times, o: opens, h: highs, l: lows, c: closes, v: volumes } = data as {
      t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[];
    };

    const client = await pool.connect();
    let inserted = 0;
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO bvc.dim_titre (ticker, nom) VALUES ($1,$1) ON CONFLICT (ticker) DO NOTHING`, [ticker.toUpperCase()]);
      for (let i = 0; i < times.length; i++) {
        const date = new Date(times[i] * 1000).toISOString().split('T')[0];
        await client.query(`
          INSERT INTO bvc.fact_cours (ticker, date_value, cloture, ouverture, haut, bas, volume)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (ticker, date_value) DO UPDATE SET
            cloture   = EXCLUDED.cloture,
            ouverture = EXCLUDED.ouverture,
            haut      = EXCLUDED.haut,
            bas       = EXCLUDED.bas,
            volume    = EXCLUDED.volume
        `, [ticker.toUpperCase(), date, closes[i], opens[i], highs[i], lows[i], volumes[i]]);
        inserted++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, ticker: ticker.toUpperCase(), rows: inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
