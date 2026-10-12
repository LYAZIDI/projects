/**
 * Import d'un fichier CSV officiel BVC (format bourse-casablanca.ma)
 * Usage: node scripts/import-bvc-csv.mjs <chemin-vers-csv>
 *
 * Le CSV est en UTF-8, séparateur ";", décimales en virgule (sauf Var%)
 * Colonnes:
 *   [0] Instrument      → ticker
 *   [1] Émetteur        → nom
 *   [2] Secteur         → secteur (noms officiels FR)
 *   [3] Qté bid         (ignoré)
 *   [4] Meilleur bid    (ignoré)
 *   [5] Qté ask         (ignoré)
 *   [6] Meilleur ask    (ignoré)
 *   [7] Dernier         → cloture
 *   [8] Ouverture       → ouverture
 *   [9] Var %           → variation_pct
 *  [10] Volume          → capitaux (valeur en MAD)
 *  [11] Plus Haut       → haut
 *  [12] Plus Bas        → bas
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '..', '.env.local'), 'utf8')
    .split('\n').filter(l => /^[A-Z_]+=/.test(l.trim()))
    .map(l => { const eq = l.indexOf('='); return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]; })
);

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-bvc-csv.mjs <chemin-vers-csv>');
  process.exit(1);
}

// Extraire la date du nom de fichier (pattern: actions_fr_YYYY-MM-DD.csv)
const dateMatch = csvPath.match(/(\d{4}-\d{2}-\d{2})/);
const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
console.log(`Date d'import: ${date}`);

const content = readFileSync(resolve(csvPath), 'utf8');
const lines = content.split(/\r?\n/).filter(Boolean);
console.log(`${lines.length - 1} lignes dans le CSV`);

function parseNum(s) {
  if (!s || s.trim() === '-' || s.trim() === '') return null;
  const n = parseFloat(s.trim().replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parsePct(s) {
  if (!s || s.trim() === '-' || s.trim() === '') return null;
  const n = parseFloat(s.trim().replace('+', '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

const rows = lines.slice(1).map(line => {
  const p = line.split(';');
  if (p.length < 13) return null;

  const ticker   = p[0].trim();
  const nom      = p[1].trim();
  const secteur  = p[2].trim() || null;
  const cloture  = parseNum(p[7]);
  const ouverture = parseNum(p[8]);
  const variation_pct = parsePct(p[9]);
  const capitaux = parseNum(p[10]);    // "Volume" BVC = valeur échangée en MAD
  const haut     = parseNum(p[11]);
  const bas      = parseNum(p[12]);

  // Dériver le nombre de titres échangés depuis la valeur et le cours
  const volume = (capitaux != null && cloture != null && cloture > 0)
    ? Math.round(capitaux / cloture)
    : null;

  return { ticker, nom, secteur, cloture, ouverture, variation_pct, capitaux, volume, haut, bas };
}).filter(Boolean);

console.log(`\nÉchantillon:`);
console.log(JSON.stringify(rows[0], null, 2));
console.log(`\n${rows.length} titres à traiter`);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query('BEGIN');

  let titresInseres = 0;
  let coursUpserts = 0;

  for (const r of rows) {
    // Upsert dim_titre — secteur CSV utilisé uniquement pour les nouveaux titres
    // (COALESCE préserve le secteur existant s'il est déjà renseigné)
    const res = await client.query(`
      INSERT INTO bvc.dim_titre (ticker, nom, secteur)
      VALUES ($1, $2, $3)
      ON CONFLICT (ticker) DO UPDATE SET
        nom        = EXCLUDED.nom,
        secteur    = COALESCE(bvc.dim_titre.secteur, EXCLUDED.secteur),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `, [r.ticker, r.nom, r.secteur]);
    if (res.rows[0]?.inserted) titresInseres++;

    // Upsert fact_cours seulement si on a un prix de clôture
    if (r.cloture != null) {
      await client.query(`
        INSERT INTO bvc.fact_cours
          (ticker, date_value, cloture, variation_pct, volume, capitaux, ouverture, haut, bas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (ticker, date_value) DO UPDATE SET
          cloture       = EXCLUDED.cloture,
          variation_pct = EXCLUDED.variation_pct,
          volume        = COALESCE(EXCLUDED.volume,   bvc.fact_cours.volume),
          capitaux      = COALESCE(EXCLUDED.capitaux, bvc.fact_cours.capitaux),
          ouverture     = COALESCE(EXCLUDED.ouverture,bvc.fact_cours.ouverture),
          haut          = COALESCE(EXCLUDED.haut,     bvc.fact_cours.haut),
          bas           = COALESCE(EXCLUDED.bas,      bvc.fact_cours.bas)
      `, [r.ticker, date, r.cloture, r.variation_pct, r.volume, r.capitaux, r.ouverture, r.haut, r.bas]);
      coursUpserts++;
    }
  }

  await client.query('COMMIT');

  // Bilan
  const { rows: total }   = await client.query(`SELECT COUNT(*) AS n FROM bvc.dim_titre`);
  const { rows: avecCours } = await client.query(`
    SELECT COUNT(DISTINCT ticker) AS n FROM bvc.fact_cours WHERE date_value = $1
  `, [date]);

  console.log('\n✅ Import BVC CSV terminé');
  console.log(`   CSV : ${rows.length} titres dans le fichier`);
  console.log(`   Nouveaux titres insérés : ${titresInseres}`);
  console.log(`   Cours upsertés (${date}) : ${coursUpserts}`);
  console.log(`   Total dim_titre : ${total[0].n}`);
  console.log(`   Titres avec cours ${date} : ${avecCours[0].n}`);

  // Lister les titres sans cours (suspendus / hors cote)
  const sansData = rows.filter(r => r.cloture == null).map(r => r.ticker);
  if (sansData.length) {
    console.log(`   Sans cours (suspendus) : ${sansData.join(', ')}`);
  }
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
await pool.end();
