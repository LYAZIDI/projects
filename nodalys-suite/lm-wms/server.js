'use strict';
/* ============================================================
 *  LM-WMS - serveur HTTP + API REST (better-sqlite3 comme seule
 *  dépendance). Sessions par cookie, rôles par route, connecteur
 *  EDI par fichiers.
 *
 *  Lancement :  node server.js          (port 8747)
 *  IHM superviseur : http://localhost:8747/
 *  Terminal RF     : http://localhost:8747/rf.html
 * ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const store = require('./lib/store');
const d = require('./lib/domaine');
const edi = require('./lib/edi');
const copilote = require('./lib/copilote');

/* ---------- Intégration suite LM (TMS externe) ----------
 * integration.json contient la clé API partagée (accès compte de
 * service pour le TMS) et l'URL du TMS à notifier au départ des
 * chargements. Fichier absent = pas d'intégration, le WMS vit seul.
 * En ligne, les variables LM_CLE_INTEGRATION et LM_TMS_URL priment. */
const FICHIER_INTEGRATION = path.join(__dirname, 'integration.json');
const INTEGRATION = process.env.LM_CLE_INTEGRATION
  ? { cleApi: process.env.LM_CLE_INTEGRATION, tmsUrl: process.env.LM_TMS_URL || '' }
  : fs.existsSync(FICHIER_INTEGRATION)
    ? JSON.parse(fs.readFileSync(FICHIER_INTEGRATION, 'utf8')) : null;

/* Poids réel d'un chargement (contenu des colis × poids articles) */
function poidsChargement(db, chargement) {
  let poids = 0;
  for (const sscc of chargement.colis) {
    const colis = db.colis.find(c => c.sscc === sscc);
    if (!colis) continue;
    for (const ligne of colis.lignes) {
      const article = db.articles.find(a => a.code === ligne.article);
      poids += (article ? article.poidsUnitaire : 0) * ligne.qte;
    }
  }
  return Math.round(Math.max(0.1, poids) * 100) / 100;
}

/* Notifie le TMS du départ d'un chargement (sans bloquer le WMS) */
async function notifierTms(chargement) {
  if (!INTEGRATION || !INTEGRATION.tmsUrl) return { notifie: false, raison: 'intégration non configurée' };
  const db = store.getDb();
  const commandes = [...new Set(chargement.colis
    .map(sscc => {
      const colis = db.colis.find(c => c.sscc === sscc);
      const commande = colis && db.commandes.find(x => x.id === colis.commande);
      return commande && commande.numero;
    }).filter(Boolean))];
  try {
    const reponse = await fetch(INTEGRATION.tmsUrl + '/api/integration/chargement-expedie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': INTEGRATION.cleApi },
      body: JSON.stringify({
        chargement: chargement.numero,
        transporteur: chargement.transporteur,
        dateDepart: chargement.dateDepart,
        nbColis: chargement.colis.length,
        poids: poidsChargement(db, chargement),
        commandes,
      }),
      signal: AbortSignal.timeout(3000),
    });
    return { notifie: reponse.ok };
  } catch (e) {
    console.warn(`[TMS] injoignable (${e.message}) — le TMS rattrapera via l'import de chargements`);
    return { notifie: false, raison: 'TMS injoignable' };
  }
}

const PORT = process.env.PORT || 8747;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DUREE_SESSION_MS = 12 * 3600 * 1000;

/* ---------- Helpers HTTP ---------- */

function repondreJson(res, code, donnees, entetes = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...entetes });
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
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function servirStatique(req, res) {
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (chemin === '/') chemin = '/index.html';
  const fichier = path.join(PUBLIC_DIR, path.normalize(chemin));
  if (!fichier.startsWith(PUBLIC_DIR) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 - introuvable');
  }
  /* no-cache : le navigateur revalide à chaque fois, donc les mises à
   * jour de l'interface (HTML/JS/CSS) sont visibles sans vidage manuel. */
  res.writeHead(200, {
    'Content-Type': TYPES_MIME[path.extname(fichier)] || 'application/octet-stream',
    'Cache-Control': 'no-cache, must-revalidate',
  });
  fs.createReadStream(fichier).pipe(res);
}

/* ---------- Sessions ----------
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
  const brut = req.headers.cookie || '';
  for (const partie of brut.split(';')) {
    const [cle, ...reste] = partie.trim().split('=');
    if (cle === nom) return reste.join('=');
  }
  return '';
}

function sessionCourante(req) {
  const [donnees, signature] = lireCookie(req, 'lmwms').split('.');
  if (!donnees || !signature) return null;
  const attendue = Buffer.from(signer(donnees));
  const recue = Buffer.from(signature);
  if (recue.length !== attendue.length || !crypto.timingSafeEqual(recue, attendue)) return null;
  let session;
  try { session = JSON.parse(Buffer.from(donnees, 'base64url').toString('utf8')); } catch { return null; }
  if (!session.expire || session.expire < Date.now()) return null;
  return session.utilisateur;
}

function ouvrirSession(req, res, utilisateur) {
  const donnees = Buffer.from(JSON.stringify({ utilisateur, expire: Date.now() + DUREE_SESSION_MS })).toString('base64url');
  res.setHeader('Set-Cookie', `lmwms=${donnees}.${signer(donnees)}; ${attributsCookie(req)}; Max-Age=${DUREE_SESSION_MS / 1000}`);
  return utilisateur;
}

function fermerSession(req, res) {
  res.setHeader('Set-Cookie', `lmwms=; ${attributsCookie(req)}; Max-Age=0`);
  return { ok: true };
}

/* ---------- Routage API ----------
 * Chaque route déclare le rôle minimal requis :
 * OPERATEUR < SUPERVISEUR < ADMIN. */
const routes = [];
function route(methode, motif, gestionnaire, role = 'OPERATEUR') {
  routes.push({ methode, segments: motif.split('/').filter(Boolean), gestionnaire, role });
}

function trouverRoute(methode, chemin) {
  const segments = chemin.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.methode !== methode || r.segments.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < segments.length; i++) {
      if (r.segments[i].startsWith(':')) params[r.segments[i].slice(1)] = segments[i];
      else if (r.segments[i] !== segments[i]) { ok = false; break; }
    }
    if (ok) return { ...r, params };
  }
  return null;
}

/* ---------- Authentification ---------- */
route('POST', '/api/connexion', (p, corps, q, contexte) => {
  const utilisateur = d.utilisateurAuthentifier(corps.code, corps.mdp);
  if (!utilisateur) { const e = new Error('Identifiants invalides'); e.metier = true; throw e; }
  return ouvrirSession(contexte.req, contexte.res, utilisateur);
}, 'PUBLIC');
route('POST', '/api/deconnexion', (p, corps, q, contexte) => fermerSession(contexte.req, contexte.res), 'PUBLIC');
route('GET', '/api/moi', (p, corps, q, contexte) => contexte.utilisateur || { anonyme: true }, 'PUBLIC');

/* ---------- Utilisateurs (ADMIN) ---------- */
route('GET',  '/api/utilisateurs', () => d.utilisateurLister(), 'ADMIN');
route('POST', '/api/utilisateurs', (p, corps) => d.utilisateurCreer(corps), 'ADMIN');
route('PUT',  '/api/utilisateurs/:code', (p, corps) => d.utilisateurModifier(p.code, corps), 'ADMIN');

/* ---------- Référentiels ---------- */
route('GET',  '/api/articles',      () => store.getDb().articles);
route('POST', '/api/articles',      (p, corps) => d.articleCreer(corps), 'SUPERVISEUR');
route('PUT',  '/api/articles/:code', (p, corps) => d.articleModifier(p.code, corps), 'SUPERVISEUR');
route('GET',  '/api/emplacements',  () => store.getDb().emplacements);
route('POST', '/api/emplacements',  (p, corps) => d.emplacementCreer(corps), 'SUPERVISEUR');
route('POST', '/api/emplacements/:code/bloquer', (p, corps) => d.emplacementBloquer(p.code, corps.bloque), 'SUPERVISEUR');
route('GET',  '/api/tiers',         () => store.getDb().tiers);
route('POST', '/api/tiers',         (p, corps) => d.tiersCreer(corps), 'SUPERVISEUR');
route('GET',  '/api/transporteurs', () => store.getDb().transporteurs);
route('POST', '/api/transporteurs', (p, corps) => d.transporteurCreer(corps), 'SUPERVISEUR');

/* ---------- Réception ---------- */
route('GET',  '/api/attendus', () => store.getDb().attendus);
route('POST', '/api/attendus', (p, corps) => d.attenduCreer(corps), 'SUPERVISEUR');
route('POST', '/api/attendus/:id/lignes/:index/receptionner', (p, corps) => {
  const resultat = d.receptionner(p.id, p.index, corps);
  if (resultat.attendu.statut === 'CLOTURE') edi.exporterRecadv(resultat.attendu);
  return resultat;
});

/* ---------- Stock / supports / inventaires / mouvements ---------- */
route('GET',  '/api/stock', () => store.getDb().stock);
route('POST', '/api/stock/:id/ajuster', (p, corps) => d.stockAjuster(p.id, corps.qte, corps.operateur, corps.motif), 'SUPERVISEUR');
route('POST', '/api/stock/:id/bloquer', (p, corps) => d.stockBloquer(p.id, corps.bloque, corps.operateur), 'SUPERVISEUR');
route('GET',  '/api/supports', () => store.getDb().supports);
route('GET',  '/api/supports/:sscc', p => d.supportContenu(p.sscc));
route('POST', '/api/supports/:sscc/deplacer', (p, corps) => d.supportDeplacer(p.sscc, corps.emplacement, corps.operateur));
route('GET',  '/api/mouvements', () => [...store.getDb().mouvements].reverse().slice(0, 500));
route('GET',  '/api/inventaires', () => store.getDb().inventaires);
route('POST', '/api/inventaires', (p, corps) => d.inventaireCreer(corps.emplacement), 'SUPERVISEUR');
route('POST', '/api/inventaires/:id/compter', (p, corps) => d.inventaireCompter(p.id, corps.comptages, corps.operateur));
route('POST', '/api/inventaires/:id/valider', (p, corps) => d.inventaireValider(p.id, corps.operateur));

/* ---------- Commandes / vagues / missions ---------- */
route('GET',  '/api/commandes', () => store.getDb().commandes);
route('POST', '/api/commandes', (p, corps) => d.commandeCreer(corps), 'SUPERVISEUR');
route('GET',  '/api/vagues', () => store.getDb().vagues);
route('POST', '/api/vagues', (p, corps) => d.vagueCreer(corps), 'SUPERVISEUR');
route('POST', '/api/vagues/:id/lancer', p => d.vagueLancer(p.id), 'SUPERVISEUR');
route('GET',  '/api/missions', (p, corps, query) => {
  let missions = store.getDb().missions;
  if (query.type) missions = missions.filter(m => m.type === query.type);
  if (query.statut) missions = missions.filter(m => m.statut === query.statut);
  return missions;
});
route('POST', '/api/missions/:id/valider', (p, corps) => d.missionValider(p.id, corps));
route('POST', '/api/reappro/detecter', () => d.reapproDetecter());

/* ---------- Colisage / expédition ---------- */
route('GET',  '/api/colis', () => store.getDb().colis);
route('POST', '/api/colis', (p, corps) => d.colisCreer(corps.commande));
route('POST', '/api/colis/:id/lignes', (p, corps) => d.colisAjouterLigne(p.id, corps));
route('POST', '/api/colis/:id/fermer', p => d.colisFermer(p.id));
route('GET',  '/api/chargements', () => store.getDb().chargements);
route('POST', '/api/chargements', (p, corps) => d.chargementCreer(corps));
route('POST', '/api/chargements/:id/colis', (p, corps) => d.chargementAjouterColis(p.id, corps.sscc));
route('POST', '/api/chargements/:id/expedier', async (p, corps) => {
  const chargement = d.chargementExpedier(p.id, corps.operateur);
  const desadv = edi.exporterDesadv(chargement);
  const tms = await notifierTms(chargement);   /* la suite TMS externe prend le relais */
  return { ...chargement, desadv, tms };
});

/* ---------- EDI ---------- */
route('GET',  '/api/edi/journal', () => edi.journal());
route('POST', '/api/edi/scanner', () => edi.scannerEntrant(), 'SUPERVISEUR');
route('POST', '/api/edi/invrpt', () => ({ fichier: edi.exporterInvrpt() }), 'SUPERVISEUR');

/* ---------- Appairage terminal RF ----------
 * Génère le QR code d'une adresse (celle que le navigateur du
 * superviseur utilise, transmise en paramètre). Un nouveau
 * téléphone scanne ce QR pour ouvrir directement le terminal RF. */
route('GET', '/api/rf/qr', async (p, corps, query) => {
  const cible = String(query.cible || '');
  if (!/^https?:\/\/[^\s]+$/.test(cible)) { const e = new Error('Adresse invalide'); e.metier = true; throw e; }
  const svg = await QRCode.toString(cible, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return { cible, svg };
});

/* ---------- Pilotage ---------- */
route('GET', '/api/dashboard', () => d.dashboard());

/* ---------- Copilote superviseur (agent IA, lecture seule) ---------- */
route('GET', '/api/copilote/etat', () => ({ actif: copilote.estActif(), modele: copilote.modele() }), 'SUPERVISEUR');
route('POST', '/api/copilote', (p, corps, q, contexte) =>
  copilote.executer({ message: corps.message, historique: corps.historique, utilisateur: contexte.utilisateur }),
  'SUPERVISEUR');

/* ---------- Serveur ----------
 * Chaque appel API : chargement de la base (store.preparer), exécution,
 * puis écriture (store.valider). En mode Turso, si une autre instance a
 * écrit entre-temps, la requête est rejouée sur la base à jour (au plus
 * 5 essais) ; les notifications sortantes y sont idempotentes (le TMS
 * refuse un chargement déjà reçu). */
const ESSAIS_MAX = 5;

const gestionnaire = (req, res) => store.enSerie(() => traiter(req, res));

async function traiter(req, res) {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return servirStatique(req, res);

  const query = Object.fromEntries(url.searchParams);
  const correspondance = trouverRoute(req.method, url.pathname);
  if (!correspondance) return repondreJson(res, 404, { erreur: 'Route inconnue' });

  /* authentification + contrôle de rôle
   * (la clé API d'intégration vaut compte de service SUPERVISEUR) */
  let utilisateur = sessionCourante(req);
  if (!utilisateur && INTEGRATION && req.headers['x-api-key'] === INTEGRATION.cleApi) {
    utilisateur = { code: 'INTEGRATION', nom: 'Compte de service TMS', role: 'SUPERVISEUR' };
  }
  if (correspondance.role !== 'PUBLIC') {
    if (!utilisateur) return repondreJson(res, 401, { erreur: 'Connexion requise' });
    if (!d.roleSuffisant(utilisateur.role, correspondance.role)) {
      return repondreJson(res, 403, { erreur: `Rôle ${correspondance.role} requis` });
    }
  }

  let corps;
  try {
    corps = (req.method === 'POST' || req.method === 'PUT') ? await lireCorps(req) : {};
  } catch (e) {
    return repondreJson(res, 400, { erreur: e.message });
  }
  /* traçabilité : l'opérateur est TOUJOURS l'utilisateur connecté */
  if (utilisateur) corps.operateur = utilisateur.code;
  const contexte = { req, res, utilisateur };

  for (let essai = 1; ; essai++) {
    try {
      await store.preparer();
      const resultat = await correspondance.gestionnaire(correspondance.params, structuredClone(corps), query, contexte);
      await store.valider();
      if (res.headersSent) return;   /* un gestionnaire a pu répondre lui-même (ex. image) */
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

/* Hébergement Vercel : api/index.js exporte le gestionnaire, pas de
 * serveur ni de tâche de fond (l'EDI se déclenche via /api/edi/scanner). */
module.exports = { gestionnaire };
edi.initialiser();

if (require.main === module) {
  /* Scrutation du répertoire EDI entrant (toutes les 5 s) */
  let scrutationEnCours = false;
  setInterval(() => {
    if (scrutationEnCours) return;
    scrutationEnCours = true;
    store.enSerie(async () => {
      await store.preparer();
      const resultats = edi.scannerEntrant();
      await store.valider();
      for (const r of resultats) console.log(`[EDI] ${r.fichier} -> ${r.statut} ${r.message || ''}`);
    }).catch(e => {
      store.abandonner();
      console.error('[EDI]', e.message);
    }).finally(() => {
      scrutationEnCours = false;
    });
  }, 5000);

  http.createServer(gestionnaire).listen(PORT, () => {
    console.log('====================================================');
    console.log('  LM-WMS démarré');
    console.log(`  IHM superviseur : http://localhost:${PORT}/`);
    console.log(`  Terminal RF     : http://localhost:${PORT}/rf.html`);
    console.log(`  EDI             : ${edi.REPERTOIRES.entrant}`);
    console.log(`  Base            : ${store.DATA_FILE}`);
    console.log('====================================================');
  });
}
