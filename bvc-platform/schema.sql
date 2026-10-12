-- BVC Platform — Schema PostgreSQL
-- Run: psql -d bvc_platform -f schema.sql

CREATE SCHEMA IF NOT EXISTS bvc;

-- ── Titres (instruments cotés à la BVC) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bvc.dim_titre (
  ticker         VARCHAR(10)  PRIMARY KEY,
  nom            VARCHAR(200) NOT NULL,
  secteur        VARCHAR(100),
  sous_secteur   VARCHAR(100),
  isin           VARCHAR(12),
  date_ipo       DATE,
  description    TEXT,
  logo_url       TEXT,
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Cours journaliers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bvc.fact_cours (
  ticker            VARCHAR(10)   NOT NULL REFERENCES bvc.dim_titre(ticker),
  date_value        DATE          NOT NULL,
  ouverture         NUMERIC(14,4),
  cloture           NUMERIC(14,4),
  haut              NUMERIC(14,4),
  bas               NUMERIC(14,4),
  volume            BIGINT,
  capitaux          NUMERIC(20,2),
  nb_transactions   INT,
  variation_pct     NUMERIC(8,4),
  PRIMARY KEY (ticker, date_value)
);

CREATE INDEX IF NOT EXISTS idx_fact_cours_date   ON bvc.fact_cours(date_value DESC);
CREATE INDEX IF NOT EXISTS idx_fact_cours_ticker ON bvc.fact_cours(ticker, date_value DESC);

-- ── Indices (MASI, MASIR, MASI 20, etc.) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS bvc.fact_indice (
  indice         VARCHAR(20)  NOT NULL,
  date_value     DATE         NOT NULL,
  valeur         NUMERIC(14,4),
  variation_pct  NUMERIC(8,4),
  PRIMARY KEY (indice, date_value)
);

-- ── Données fondamentales par titre (GuruFocus-style) ─────────────────────────
CREATE TABLE IF NOT EXISTS bvc.dim_fondamentaux (
  ticker          VARCHAR(10)  PRIMARY KEY REFERENCES bvc.dim_titre(ticker),
  -- Profitabilité
  roe_pct         NUMERIC(8,4),
  roa_pct         NUMERIC(8,4),
  roic_pct        NUMERIC(8,4),
  roce_pct        NUMERIC(8,4),
  -- Force financière
  debt_to_equity  NUMERIC(8,4),
  debt_to_ebitda  NUMERIC(8,4),
  current_ratio   NUMERIC(8,4),
  interest_coverage NUMERIC(8,4),
  -- Scores
  piotroski_score INT,
  altman_z_score  NUMERIC(8,4),
  -- Valorisation
  per             NUMERIC(8,4),
  pbr             NUMERIC(8,4),
  gf_value        NUMERIC(14,4),
  gf_score        INT,
  -- Market cap
  market_cap      NUMERIC(20,2),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vue: dernière cotation par titre ─────────────────────────────────────────
CREATE OR REPLACE VIEW bvc.v_derniere_cotation AS
SELECT DISTINCT ON (c.ticker)
  c.ticker,
  t.nom,
  t.secteur,
  c.date_value,
  c.cloture       AS prix,
  c.variation_pct AS variation,
  c.volume,
  c.capitaux,
  c.haut,
  c.bas,
  c.ouverture
FROM bvc.fact_cours c
JOIN bvc.dim_titre t ON t.ticker = c.ticker
ORDER BY c.ticker, c.date_value DESC;

-- ── Vue: performance YTD par titre ───────────────────────────────────────────
CREATE OR REPLACE VIEW bvc.v_perf_ytd AS
WITH debut_annee AS (
  SELECT ticker, MIN(date_value) AS first_date
  FROM bvc.fact_cours
  WHERE EXTRACT(YEAR FROM date_value) = EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY ticker
),
cours_debut AS (
  SELECT c.ticker, c.cloture AS prix_debut
  FROM bvc.fact_cours c
  JOIN debut_annee d ON d.ticker = c.ticker AND d.first_date = c.date_value
),
cours_fin AS (
  SELECT DISTINCT ON (ticker) ticker, cloture AS prix_fin
  FROM bvc.fact_cours
  ORDER BY ticker, date_value DESC
)
SELECT
  cf.ticker,
  cd.prix_debut,
  cf.prix_fin,
  ROUND(((cf.prix_fin - cd.prix_debut) / NULLIF(cd.prix_debut, 0)) * 100, 2) AS ytd_pct
FROM cours_fin cf
JOIN cours_debut cd ON cd.ticker = cf.ticker;
