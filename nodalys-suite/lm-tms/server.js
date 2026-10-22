'use strict';
/* ============================================================
 *  LM-TMS - serveur HTTP + API REST (application autonome).
 *
 *  Lancement :  node server.js          (port 8748)
 *  IHM : http://localhost:8748/
 *
 *  Authentification déléguée au LM-WMS (comptes uniques de la
 *  suite). Le webhook /api/integration/* est protégé par la clé
 *  partagée de config.json (ou LM_CLE_INTEGRATION en ligne).
 * ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./lib/config');
const store = require('./lib/store');
const tms = require('./lib/tms');
const wms = require('./lib/wms-client');
const integration = require('./lib/integration');

const PORT = process.env.PORT || config.port || 8748;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DUREE_SESSION_MS = 12 * 3600 * 1000;
const NIVEAUX_ROLE = { OPERATEUR: 1, SUPERVISEUR: 2, ADMIN: 3 };

/* ---------- Helpers HTTP ---------- */

function repondreJson(res, code, donnees) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(donnees));
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let brut = '';
    req.on('data', morceau => { brut += morceau; if (brut.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!brut) return resolve({});
      try { resolve(JSON.parse(brut)); } catch { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
};

function servirStatique(req, res) {
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (chemin === '/') chemin = '/index.html';
  const fichier = path.join(PUBLIC_DIR, path.normalize(chemin));
  if (!fichier.startsWith(PUBLIC_DIR) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 - introuvable');
  }
  res.writeHead(200, { 'Content-Type': TYPES_MIME[path.extname(fichier)] || 'application/octet-stream',
    'Cache-Control': 'no-cache, must-revalidate' });
  fs.createReadStream(fichier).pipe(res);
}

/* ---------- Sessions (cookie lmtms signé) ----------
 * Cookie signé (HMAC) portant l'utilisateur et l'expiration (12 h) :
 * rien à stocker côté serveur, donc valable sur toutes les instances
 * Vercel. Secret LM_SECRET_SESSION ; à défaut (local), un secret tiré
 * au démarrage — il suffit alors de se reconnecter après relance.
 */
const SECRET_SESSION = process.env.LM_SECRET_SESSION || crypto.randomBytes(32).toString('hex');

function signer(texte) {
  return crypto.createHmac('sha256', SECRET_SESSION).update(texte).digest('base64url');
}

/* Secure seulement en HTTPS (le local reste en http://localhost) */
function attributsCookie(req) {
  const https = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return `HttpOnly; SameSite=Lax; Path=/${https ? '; Secure' : ''}`;
}

function lireCookie(req, nom) {
  for (const partie of (req.headers.cookie || '').split(';')) {
    const [cle, ...reste] = partie.trim().split('=');
    if (cle === nom) return reste.join('=');
  }
  return '';
}

function sessionCourante(req) {
  const [donnees, signature] = lireCookie(req, 'lmtms').split('.');
  if (!donnees || !signature) return null;
  const attendue = Buffer.from(signer(donnees));
  const recue = Buffer.from(signature);
  if (recue.length !== attendue.length || !crypto.timingSafeEqual(recue, attendue)) return null;
  let session;
  try { session = JSON.parse(Buffer.from(donnees, 'base64url').toString('utf8')); } catch { return null; }
  if (!session.expire || session.expire < Date.now()) return null;
  return session.utilisateur;
}

/* ---------- Routage ---------- */
const routes = [];
function route(methode, motif, gestionnaire, role = 'OPERATEUR') {
  routes.push({ methode, segments: motif.split('/').filter(Boolean), gestionnaire, role });
}
function trouverRoute(methode, chemin) {
  const segments = chemin.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.methode !== methode || r.segments.length !== segments.length) continue;
    const params = {}; let ok = true;
    for (let i = 0; i < segments.length; i++) {
      if (r.segments[i].startsWith(':')) params[r.segments[i].slice(1)] = segments[i];
      else if (r.segments[i] !== segments[i]) { ok = false; break; }
    }
    if (ok) return { ...r, params };
  }
  return null;
}

/* ---------- Authentification (déléguée au WMS) ---------- */
route('POST', '/api/connexion', async (p, corps, q, contexte) => {
  const utilisateur = await wms.authentifier(corps.code, corps.mdp);
  if (!utilisateur || utilisateur.anonyme) {
    const e = new Error('Identifiants refusés par le WMS (comptes uniques de la suite)');
    e.metier = true; throw e;
  }
  const donnees = Buffer.from(JSON.stringify({ utilisateur, expire: Date.now() + DUREE_SESSION_MS })).toString('base64url');
  contexte.res.setHeader('Set-Cookie',
    `lmtms=${donnees}.${signer(donnees)}; ${attributsCookie(contexte.req)}; Max-Age=${DUREE_SESSION_MS / 1000}`);
  return utilisateur;
}, 'PUBLIC');
route('POST', '/api/deconnexion', (p, corps, q, contexte) => {
  contexte.res.setHeader('Set-Cookie', `lmtms=; ${attributsCookie(contexte.req)}; Max-Age=0`);
  return { ok: true };
}, 'PUBLIC');
route('GET', '/api/moi', (p, corps, q, contexte) => contexte.utilisateur || { anonyme: true }, 'PUBLIC');

/* ---------- État de la liaison WMS ---------- */
route('GET', '/api/etat', async () => {
  const db = store.getDb();
  return {
    wms: await wms.etatWms(),
    transporteurs: db.transporteurs.length,
    grilles: db.grillesTarifaires.length,
    expeditions: db.expeditions.length,
  };
});

/* ---------- Transporteurs (référentiel local, synchronisé) ---------- */
route('GET',  '/api/transporteurs', () => store.getDb().transporteurs);
route('PUT',  '/api/transporteurs/:code', (p, corps) => tms.transporteurModifier(p.code, corps), 'SUPERVISEUR');
route('POST', '/api/transporteurs/synchroniser', () => integration.synchroniserTransporteurs(), 'SUPERVISEUR');

/* ---------- Grilles + simulation ---------- */
route('GET',  '/api/grilles', () => store.getDb().grillesTarifaires);
route('POST', '/api/grilles', (p, corps) => tms.grilleCreer(corps), 'SUPERVISEUR');
route('PUT',  '/api/grilles/:id', (p, corps) => tms.grilleModifier(p.id, corps), 'SUPERVISEUR');
route('POST', '/api/grilles/:id/supprimer', p => tms.grilleSupprimer(p.id), 'SUPERVISEUR');
route('POST', '/api/simuler', (p, corps) => tms.simulerCouts(corps.poids, corps.service));

/* ---------- Expéditions & suivi ---------- */
route('GET',  '/api/expeditions', () => [...store.getDb().expeditions].reverse());
route('POST', '/api/expeditions/:id/evenement', (p, corps) => tms.expeditionEvenement(p.id, corps));
route('POST', '/api/chargements/importer', () => integration.importerChargements(), 'SUPERVISEUR');

/* ---------- Pré-facturation ---------- */
route('GET',  '/api/factures', () => [...store.getDb().facturesTransport].reverse());
route('POST', '/api/factures', (p, corps) => tms.factureSaisir(corps), 'SUPERVISEUR');
route('POST', '/api/factures/:id/statuer', (p, corps) => tms.factureStatuer(p.id, corps.statut), 'SUPERVISEUR');

/* ---------- KPI ---------- */
route('GET', '/api/kpi', () => tms.kpiTransport());

/* ---------- Webhook entrant du WMS (clé partagée) ---------- */
route('POST', '/api/integration/chargement-expedie', (p, corps, q, contexte) => {
  if (contexte.req.headers['x-api-key'] !== config.cleIntegration) {
    const e = new Error('Clé d\'intégration invalide'); e.metier = true; throw e;
  }
  const expedition = tms.expeditionEnregistrer(corps);
  console.log(`[WMS->TMS] chargement ${corps.chargement} -> expédition ${expedition.numero} (${expedition.coutEstime} €)`);
  return expedition;
}, 'PUBLIC');

/* ---------- Serveur ----------
 * Chaque appel API : chargement de la base (store.preparer), exécution,
 * puis écriture (store.valider). En mode Turso, si une autre instance a
 * écrit entre-temps, la requête est rejouée sur la base à jour (au plus
 * 5 essais) ; les écritures y sont idempotentes (une expédition par
 * chargement, upsert des transporteurs). */
const ESSAIS_MAX = 5;

const gestionnaire = (req, res) => store.enSerie(() => traiter(req, res));

async function traiter(req, res) {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return servirStatique(req, res);

  const query = Object.fromEntries(url.searchParams);
  const correspondance = trouverRoute(req.method, url.pathname);
  if (!correspondance) return repondreJson(res, 404, { erreur: 'Route inconnue' });

  /* la clé d'intégration de la suite vaut compte de service
   * (utilisée par l'OMS pour la simulation et le suivi) */
  let utilisateur = sessionCourante(req);
  if (!utilisateur && req.headers['x-api-key'] === config.cleIntegration) {
    utilisateur = { code: 'INTEGRATION', nom: 'Compte de service suite LM', role: 'SUPERVISEUR' };
  }
  if (correspondance.role !== 'PUBLIC') {
    if (!utilisateur) return repondreJson(res, 401, { erreur: 'Connexion requise' });
    if ((NIVEAUX_ROLE[utilisateur.role] || 0) < NIVEAUX_ROLE[correspondance.role]) {
      return repondreJson(res, 403, { erreur: `Rôle ${correspondance.role} requis` });
    }
  }

  let corps;
  try {
    corps = (req.method === 'POST' || req.method === 'PUT') ? await lireCorps(req) : {};
  } catch (e) {
    return repondreJson(res, 400, { erreur: e.message });
  }
  if (utilisateur) corps.operateur = utilisateur.code;
  const contexte = { req, res, utilisateur };

  for (let essai = 1; ; essai++) {
    try {
      await store.preparer();
      const resultat = await correspondance.gestionnaire(correspondance.params, structuredClone(corps), query, contexte);
      await store.valider();
      return repondreJson(res, 200, resultat === undefined ? { ok: true } : resultat);
    } catch (e) {
      store.abandonner();
      if (e.conflit && essai < ESSAIS_MAX) {
        await new Promise(r => setTimeout(r, 20 + Math.random() * 80 * essai));
        continue;
      }
      if (!e.metier && !e.conflit) console.error(e);
      return repondreJson(res, e.metier ? 400 : e.conflit ? 409 : 500, { erreur: e.message });
    }
  }
}

/* Hébergement Vercel : api/index.js exporte le gestionnaire. */
module.exports = { gestionnaire };

if (require.main === module) {
  http.createServer(gestionnaire).listen(PORT, () => {
    console.log('====================================================');
    console.log('  LM-TMS démarré (application autonome)');
    console.log(`  IHM transport : http://localhost:${PORT}/`);
    console.log(`  WMS attendu   : ${config.wmsUrl}`);
    console.log(`  Base          : ${store.DATA_FILE}`);
    console.log('====================================================');
  });
}
