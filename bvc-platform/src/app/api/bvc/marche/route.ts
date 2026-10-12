import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // v_derniere_cotation exposes: ticker, nom, secteur, date_value, prix, variation, volume, capitaux, haut, bas, ouverture
    const { rows } = await pool.query(`
      SELECT
        c.ticker,
        c.nom,
        t.secteur,
        c.date_value                               AS date,
        c.prix,
        c.variation,
        c.volume,
        c.capitaux,
        c.haut,
        c.bas,
        c.ouverture,
        COALESCE(f.ytd_tv_pct, ytd_calc.ytd_pct)  AS ytd,
        f.market_cap                               AS market_cap
      FROM bvc.v_derniere_cotation c
      JOIN bvc.dim_titre t ON t.ticker = c.ticker
      LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = c.ticker
      LEFT JOIN bvc.v_perf_ytd ytd_calc ON ytd_calc.ticker = c.ticker
      ORDER BY f.market_cap DESC NULLS LAST, c.ticker
    `);

    const data = rows.map(r => ({
      ticker:    r.ticker,
      nom:       r.nom,
      secteur:   r.secteur,
      date:      r.date,
      prix:      r.prix       != null ? parseFloat(r.prix)       : null,
      variation: r.variation  != null ? parseFloat(r.variation)  : null,
      volume:    r.volume     != null ? parseInt(r.volume, 10)   : null,
      capitaux:  r.capitaux   != null ? parseFloat(r.capitaux)   : null,
      haut:      r.haut       != null ? parseFloat(r.haut)       : null,
      bas:       r.bas        != null ? parseFloat(r.bas)        : null,
      ouverture: r.ouverture  != null ? parseFloat(r.ouverture)  : null,
      ytd:       r.ytd        != null ? parseFloat(r.ytd)        : null,
      marketCap: r.market_cap != null ? parseFloat(r.market_cap) : null,
    }));

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
