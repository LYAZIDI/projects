import pool from '../db';

export async function getDerniereCotation() {
  const { rows } = await pool.query(`
    SELECT ticker, nom, secteur, date_value, prix, variation, volume, capitaux, haut, bas, ouverture
    FROM bvc.v_derniere_cotation
    ORDER BY capitaux DESC NULLS LAST
  `);
  return rows;
}

export async function getPerfYtd() {
  const { rows } = await pool.query(`
    SELECT v.ticker, t.nom, t.secteur, v.prix_debut, v.prix_fin, v.ytd_pct
    FROM bvc.v_perf_ytd v
    JOIN bvc.dim_titre t ON t.ticker = v.ticker
    ORDER BY v.ytd_pct DESC NULLS LAST
  `);
  return rows;
}

export async function getHistoriqueTitre(ticker: string, jours = 365) {
  const { rows } = await pool.query(`
    SELECT date_value, ouverture, cloture, haut, bas, volume, variation_pct
    FROM bvc.fact_cours
    WHERE ticker = $1
      AND date_value >= CURRENT_DATE - INTERVAL '${jours} days'
    ORDER BY date_value ASC
  `, [ticker]);
  return rows;
}

export async function getTitreDetail(ticker: string) {
  // v_derniere_cotation exposes: prix, variation, volume, capitaux, date_value, haut, bas, ouverture
  const { rows } = await pool.query(`
    SELECT
      t.*,
      c.prix,
      c.variation,
      c.volume,
      c.capitaux,
      c.haut,
      c.bas,
      c.ouverture,
      c.date_value,
      f.roe_pct, f.roa_pct, f.roic_pct, f.roce_pct,
      f.debt_to_equity, f.debt_to_ebitda, f.current_ratio, f.interest_coverage,
      f.piotroski_score, f.altman_z_score,
      f.per, f.pbr, f.gf_value, f.gf_score, f.market_cap, f.ytd_tv_pct
    FROM bvc.dim_titre t
    LEFT JOIN bvc.v_derniere_cotation c ON c.ticker = t.ticker
    LEFT JOIN bvc.dim_fondamentaux f ON f.ticker = t.ticker
    WHERE t.ticker = $1
  `, [ticker]);
  return rows[0] ?? null;
}

export async function getIndiceHistorique(indice: string, jours = 365) {
  const { rows } = await pool.query(`
    SELECT date_value, valeur, variation_pct
    FROM bvc.fact_indice
    WHERE indice = $1
      AND date_value >= CURRENT_DATE - INTERVAL '${jours} days'
    ORDER BY date_value ASC
  `, [indice]);
  return rows;
}

export async function getTousLesTickers() {
  const { rows } = await pool.query(`
    SELECT ticker, nom, secteur FROM bvc.dim_titre ORDER BY ticker
  `);
  return rows;
}
