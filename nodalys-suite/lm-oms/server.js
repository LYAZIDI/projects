'use strict';
/* ============================================================
 *  LM-OMS - serveur HTTP + API REST (application autonome).
 *
 *  Lancement :  node server.js          (port 8749)
 *  IHM : http://localhost:8749/
 *
 *  Tour de contrôle des commandes de la suite LM : reçoit les
 *  commandes des canaux de vente, contrôle le stock (WMS),
 *  choisit le transporteur (TMS), transmet au WMS et suit
 *  chaque commande jusqu'à la livraison.
 * ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config.json');
const store = require('./lib/store');
const oms = require('./lib/oms');
const suite = require('./lib/suite-client');
const integration = require('./lib/integration');
const typesafe = require('./lib/typesafe');

const PORT = process.env.PORT || config.port || 8749;
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

/* ---------- Sessions (cookie lmoms, auth déléguée au WMS) ---------- */
const sessions = new Map();

function lireCookie(req, nom) {
  for (const partie of (req.headers.cookie || '').split(';')) {
    const [cle, ...reste] = partie.trim().split('=');
    if (cle === nom) return reste.join('=');
  }
  return '';
}

function sessionCourante(req) {
  const session = sessions.get(lireCookie(req, 'lmoms'));
  if (!session || session.expire < Date.now()) return null;
  session.expire = Date.now() + DUREE_SESSION_MS;
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

/* ---------- Authentification ---------- */
route('POST', '/api/connexion', async (p, corps, q, contexte) => {
  const utilisateur = await suite.authentifier(corps.code, corps.mdp);
  if (!utilisateur || utilisateur.anonyme) {
    const e = new Error('Identifiants refusés par le WMS (comptes uniques de la suite)');
    e.metier = true; throw e;
  }
  const jeton = crypto.randomBytes(24).toString('hex');
  sessions.set(jeton, { utilisateur, expire: Date.now() + DUREE_SESSION_MS });
  contexte.res.setHeader('Set-Cookie',
    `lmoms=${jeton}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DUREE_SESSION_MS / 1000}`);
  return utilisateur;
}, 'PUBLIC');
route('POST', '/api/deconnexion', (p, corps, q, contexte) => {
  sessions.delete(lireCookie(contexte.req, 'lmoms'));
  contexte.res.setHeader('Set-Cookie', 'lmoms=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return { ok: true };
}, 'PUBLIC');
route('GET', '/api/moi', (p, corps, q, contexte) => contexte.utilisateur || { anonyme: true }, 'PUBLIC');

/* ---------- État des liaisons ---------- */
route('GET', '/api/etat', async () => {
  const db = store.getDb();
  const [wms, tms] = await Promise.all([
    suite.etatLiaison(suite.config.wmsUrl), suite.etatLiaison(suite.config.tmsUrl),
  ]);
  return { wms, tms, clients: db.clients.length, canaux: db.canaux.length,
           commandes: db.commandes.length };
});

/* ---------- Canaux de vente ---------- */
route('GET',  '/api/canaux', () => store.getDb().canaux);
route('POST', '/api/canaux', (p, corps) => oms.canalCreer(corps), 'SUPERVISEUR');
route('PUT',  '/api/canaux/:code', (p, corps) => oms.canalModifier(p.code, corps), 'SUPERVISEUR');

/* ---------- Clients ---------- */
route('GET',  '/api/clients', () => store.getDb().clients);
route('POST', '/api/clients/synchroniser', () => integration.synchroniserClients(), 'SUPERVISEUR');

/* ---------- Commandes ---------- */
route('GET',  '/api/commandes', () => [...store.getDb().commandes].reverse());
route('POST', '/api/commandes', (p, corps) => oms.commandeCreer(corps));
route('POST', '/api/commandes/analyser', (p, corps) => integration.analyserCommande(corps.texte));
route('GET',  '/api/analyse/etat', () => ({ disponible: typesafe.configure() }));
route('POST', '/api/commandes/:id/valider', p => integration.validerCommande(p.id));
route('POST', '/api/commandes/:id/transmettre', p => integration.transmettreCommande(p.id));
route('POST', '/api/commandes/:id/annuler', p => oms.commandeAnnuler(p.id), 'SUPERVISEUR');
route('GET',  '/api/commandes/:id/suivi', p => integration.suivi360(p.id));
route('POST', '/api/suivi/rafraichir', () => integration.rafraichirSuivi());

/* ---------- KPI ---------- */
route('GET', '/api/kpi', () => oms.kpi());

/* ---------- Serveur ---------- */
const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return servirStatique(req, res);

  const query = Object.fromEntries(url.searchParams);
  const correspondance = trouverRoute(req.method, url.pathname);
  if (!correspondance) return repondreJson(res, 404, { erreur: 'Route inconnue' });

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

  try {
    const corps = (req.method === 'POST' || req.method === 'PUT') ? await lireCorps(req) : {};
    if (utilisateur) corps.operateur = utilisateur.code;
    const contexte = { req, res, utilisateur };
    const resultat = await correspondance.gestionnaire(correspondance.params, corps, query, contexte);
    repondreJson(res, 200, resultat === undefined ? { ok: true } : resultat);
  } catch (e) {
    repondreJson(res, e.metier ? 400 : 500, { erreur: e.message });
    if (!e.metier) console.error(e);
  }
});

/* Rafraîchissement automatique du suivi toutes les 60 s */
let suiviEnCours = false;
setInterval(async () => {
  if (suiviEnCours) return;
  suiviEnCours = true;
  try {
    const r = await integration.rafraichirSuivi();
    if (r.misesAJour > 0) console.log(`[SUIVI] ${r.misesAJour} commande(s) mise(s) à jour depuis le WMS/TMS`);
  } catch { /* WMS injoignable : prochaine passe */ }
  finally { suiviEnCours = false; }
}, 60000);

serveur.listen(PORT, () => {
  console.log('====================================================');
  console.log('  LM-OMS démarré (tour de contrôle des commandes)');
  console.log(`  IHM : http://localhost:${PORT}/`);
  console.log(`  WMS attendu : ${config.wmsUrl}  ·  TMS attendu : ${config.tmsUrl}`);
  console.log('====================================================');
});
