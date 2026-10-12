/**
 * Lance un sync complet (cotations + indices) en passant par l'API locale.
 * Lancer le dev server d'abord: npm run dev
 * Usage: node scripts/sync-now.mjs
 */
const SECRET = 'bvc-scraper-secret-2026';
const BASE   = process.env.API_URL ?? 'http://localhost:3000';

const res = await fetch(`${BASE}/api/scraper/sync`, {
  method: 'POST',
  headers: { 'x-scraper-secret': SECRET },
});

const body = await res.json();
if (res.ok) {
  console.log(`✅ Sync OK — ${body.titres} titres, ${body.indices} indices (${body.date})`);
} else {
  console.error('❌ Erreur:', body);
  process.exit(1);
}
