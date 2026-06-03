-- Job Copilot — PostgreSQL Schema
-- Run once: npx tsx src/db/migrate.ts

-- ── Profile (CV utilisateur) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  raw_text      TEXT,
  skills        JSONB  NOT NULL DEFAULT '[]',
  experience    JSONB  NOT NULL DEFAULT '[]',
  education     JSONB  NOT NULL DEFAULT '[]',
  languages     JSONB  NOT NULL DEFAULT '[]',
  ats_score     INTEGER DEFAULT 0,
  ats_found     JSONB  NOT NULL DEFAULT '[]',
  ats_missing   JSONB  NOT NULL DEFAULT '[]',
  years_exp     INTEGER DEFAULT 0,
  sector        TEXT,
  skills_lower  JSONB  NOT NULL DEFAULT '[]',
  key_terms     JSONB  NOT NULL DEFAULT '[]',
  saved_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT,
  location      TEXT,
  contract      TEXT,
  salary        TEXT,
  remote        BOOLEAN DEFAULT FALSE,
  score         INTEGER DEFAULT 0,
  category      TEXT,
  source        TEXT,
  tags          JSONB   NOT NULL DEFAULT '[]',
  description   TEXT,
  url           TEXT,
  logo          TEXT,
  posted_at     TEXT,
  fetched_at    TEXT,
  applied       BOOLEAN DEFAULT FALSE,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_score    ON jobs(score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_read ON notifications(read);
