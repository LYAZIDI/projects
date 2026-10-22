'use strict';
/* ============================================================
 *  LM-SUITE - Portail unique de la suite logistique LM.
 *
 *  Porte d'entrée commerciale + technique aux trois applications
 *  (WMS, TMS, OMS). Applique la stratégie tarifaire : chaque
 *  module a son prix, seuls les modules de l'abonnement PAYÉ
 *  donnent accès ; les autres apparaissent comme upsell.
 *
 *  Lancement :  node server.js          (port 8750)
 *  Zéro dépendance (node:http seul). Auth déléguée au LM-WMS.
 * ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./lib/config');
const stockage = require('./lib/stockage');

const PORT = process.env.PORT || config.port || 8750;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DUREE_SESSION_MS = 12 * 3600 * 1000;
const NIVEAUX_ROLE = { OPERATEUR: 1, SUPERVISEUR: 2, ADMIN: 3 };

/* ------------------------------------------------------------
 *  Catalogue produits (stratégie tarifaire de la suite)
 * ------------------------------------------------------------ */
/* URL interne (auth + contrôle d'état, côté serveur) et URL publique
 * (lien "Ouvrir" affiché au navigateur). Si l'URL publique n'est pas
 * renseignée dans config.json, on retombe sur l'URL interne. */
const URL_INTERNE = { WMS: config.wmsUrl, TMS: config.tmsUrl, OMS: config.omsUrl };
const URL_PUBLIQUE = {
  WMS: config.wmsUrlPublic || config.wmsUrl,
  TMS: config.tmsUrlPublic || config.tmsUrl,
  OMS: config.omsUrlPublic || config.omsUrl,
};

const MODULES = [
  {
    code: 'WMS', nom: 'LM-WMS', sousTitre: 'Gestion d\'entrepôt',
    url: URL_PUBLIQUE.WMS, prix: 49, couleur: '#2f80c3', emoji: '📦',
    accroche: 'Le cœur logistique : réception, stock, préparation, expédition.',
    atouts: ['Picking scanné sur smartphone', 'Traçabilité lots & DLC (FEFO)',
             'Palettes SSCC & terminal RF', 'Connecteur EDI intégré'],
  },
  {
    code: 'TMS', nom: 'LM-TMS', sousTitre: 'Gestion du transport',
    url: URL_PUBLIQUE.TMS, prix: 29, couleur: '#2f9e68', emoji: '🚚',
    accroche: 'Le meilleur transporteur, au meilleur prix, sans y penser.',
    atouts: ['Grilles tarifaires multi-transporteurs', 'Simulateur du moins cher',
             'Suivi des expéditions', 'Contrôle des factures transport'],
  },
  {
    code: 'OMS', nom: 'LM-OMS', sousTitre: 'Tour de contrôle des commandes',
    url: URL_PUBLIQUE.OMS, prix: 39, couleur: '#8e4ea6', emoji: '🎛️',
    accroche: 'Toutes vos ventes, tous canaux, pilotées d\'un seul écran.',
    atouts: ['Commandes omnicanales', 'Choix transporteur automatique',
             'Contrôle du stock avant promesse', 'Suivi 360° jusqu\'à la livraison'],
  },
];

/* Packs = la grille d'abonnement affichée dans la vitrine */
const PACKS = [
  { code: 'ESSENTIEL', nom: 'Essentiel', modules: ['WMS'], prix: 49,
    argument: 'Démarrez avec le WMS seul.' },
  { code: 'LOGISTIQUE', nom: 'Logistique', modules: ['WMS', 'TMS'], prix: 69,
    argument: 'Entrepôt + transport optimisé.', populaire: true },
  { code: 'SUITE', nom: 'Suite complète', modules: ['WMS', 'TMS', 'OMS'], prix: 99,
    argument: 'Le Logistics Manager complet, omnicanal.' },
];

/* L'abonnement (modifiable par un ADMIN) et le journal du smoke test
 * sont persistés par lib/stockage.js : fichiers JSON en local, base
 * Turso en ligne. */

/* Pack dont la composition correspond EXACTEMENT aux modules actifs */
function packPour(modules) {
  const actifs = MODULES.filter(m => modules[m.code]).map(m => m.code).sort().join(',');
  return PACKS.find(p => [...p.modules].sort().join(',') === actifs) || null;
}

/* Nom de pack correspondant exactement aux modules actifs, sinon 'SUR_MESURE' */
function planPour(modules) {
  const pack = packPour(modules);
  return pack ? pack.code : 'SUR_MESURE';
}

/* Prix courant : le tarif remisé du pack si la composition correspond
 * à une formule ; sinon la somme des modules (plafonnée à la Suite). */
function prixCourant(modules) {
  const pack = packPour(modules);
  if (pack) return pack.prix;
  const somme = MODULES.filter(m => modules[m.code]).reduce((s, m) => s + m.prix, 0);
  return Math.min(somme, PACKS.find(p => p.code === 'SUITE').prix);
}

/* ------------------------------------------------------------
 *  Helpers HTTP
 * ------------------------------------------------------------ */
function repondreJson(res, code, donnees) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(donnees));
}
function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let brut = '';
    req.on('data', m => { brut += m; if (brut.length > 1e6) req.destroy(); });
    req.on('end', () => { if (!brut) return resolve({});
      try { resolve(JSON.parse(brut)); } catch { reject(new Error('JSON invalide')); } });
    req.on('error', reject);
  });
}
const TYPES_MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function servirStatique(req, res) {
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (chemin === '/') chemin = '/index.html';
  const fichier = path.join(PUBLIC_DIR, path.normalize(chemin));
  if (!fichier.startsWith(PUBLIC_DIR) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': TYPES_MIME[path.extname(fichier)] || 'application/octet-stream',
    'Cache-Control': 'no-cache, must-revalidate' });
  fs.createReadStream(fichier).pipe(res);
}

/* ------------------------------------------------------------
 *  Sessions (auth déléguée au WMS, cookie lmportail signé)
 *
 *  Cookie signé (HMAC) portant l'utilisateur et l'expiration (12 h) :
 *  rien à stocker côté serveur, donc valable sur toutes les instances
 *  Vercel. Secret LM_SECRET_SESSION ; à défaut (local), un secret tiré
 *  au démarrage — il suffit alors de se reconnecter après relance.
 * ------------------------------------------------------------ */
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
  for (const p of (req.headers.cookie || '').split(';')) {
    const [c, ...r] = p.trim().split('=');
    if (c === nom) return r.join('=');
  }
  return '';
}
function sessionCourante(req) {
  const [donnees, signature] = lireCookie(req, 'lmportail').split('.');
  if (!donnees || !signature) return null;
  const attendue = Buffer.from(signer(donnees));
  const recue = Buffer.from(signature);
  if (recue.length !== attendue.length || !crypto.timingSafeEqual(recue, attendue)) return null;
  let session;
  try { session = JSON.parse(Buffer.from(donnees, 'base64url').toString('utf8')); } catch { return null; }
  if (!session.expire || session.expire < Date.now()) return null;
  return session.utilisateur;
}
async function authentifierWms(code, mdp) {
  const reponse = await fetch(config.wmsUrl + '/api/connexion', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, mdp }), signal: AbortSignal.timeout(5000),
  });
  if (!reponse.ok) return null;
  return reponse.json();
}
async function etatApplication(url) {
  try {
    const r = await fetch(url + '/api/moi', { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch { return false; }
}

/* ------------------------------------------------------------
 *  Routage
 * ------------------------------------------------------------ */
const routes = [];
function route(methode, motif, gestionnaire, role = 'PUBLIC') {
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

route('POST', '/api/connexion', async (p, corps, contexte) => {
  const utilisateur = await authentifierWms(corps.code, corps.mdp);
  if (!utilisateur || utilisateur.anonyme) {
    const e = new Error('Identifiants refusés (comptes de la suite LM)'); e.metier = true; throw e;
  }
  const donnees = Buffer.from(JSON.stringify({ utilisateur, expire: Date.now() + DUREE_SESSION_MS })).toString('base64url');
  contexte.res.setHeader('Set-Cookie',
    `lmportail=${donnees}.${signer(donnees)}; ${attributsCookie(contexte.req)}; Max-Age=${DUREE_SESSION_MS / 1000}`);
  return utilisateur;
});
route('POST', '/api/deconnexion', (p, corps, contexte) => {
  contexte.res.setHeader('Set-Cookie', `lmportail=; ${attributsCookie(contexte.req)}; Max-Age=0`);
  return { ok: true };
});
route('GET', '/api/moi', (p, corps, contexte) => contexte.utilisateur || { anonyme: true });

/* Catalogue + abonnement : c'est le cœur du portail.
 * Les modules NON souscrits n'exposent PAS leur URL (pas d'accès),
 * seulement leur prix (upsell). */
route('GET', '/api/portail', async (p, corps, contexte) => {
  const abonnement = await stockage.lireAbonnement();
  const modules = MODULES.map(m => {
    const actif = !!abonnement.modules[m.code];
    return {
      code: m.code, nom: m.nom, sousTitre: m.sousTitre, prix: m.prix,
      couleur: m.couleur, emoji: m.emoji, accroche: m.accroche, atouts: m.atouts,
      actif,
      url: actif ? m.url : null,   /* accès réservé aux modules payés */
    };
  });
  /* état des services (contrôle sur l'URL interne, fiable et rapide) */
  const enLigne = {};
  await Promise.all(modules.filter(m => m.actif).map(async m => {
    enLigne[m.code] = await etatApplication(URL_INTERNE[m.code]);
  }));
  return {
    client: abonnement.client,
    plan: planPour(abonnement.modules),
    planNom: (PACKS.find(x => x.code === planPour(abonnement.modules)) || {}).nom || 'Sur mesure',
    cycle: abonnement.cycle, depuis: abonnement.depuis,
    prixTotal: prixCourant(abonnement.modules),
    modules, packs: PACKS, enLigne,
    estAdmin: !!(contexte.utilisateur && contexte.utilisateur.role === 'ADMIN'),
  };
});

/* ADMIN : activer / désactiver un module (simule la gestion d'abonnement) */
route('POST', '/api/abonnement/module/:code', async (p, corps, contexte) => {
  if (!contexte.utilisateur || contexte.utilisateur.role !== 'ADMIN') {
    const e = new Error('Réservé à l\'administrateur du compte'); e.metier = true; throw e;
  }
  const code = p.code.toUpperCase();
  if (!MODULES.find(m => m.code === code)) { const e = new Error('Module inconnu'); e.metier = true; throw e; }
  if (code === 'WMS' && corps.actif === false) {
    const e = new Error('Le WMS est le socle de la suite : il ne peut pas être désactivé'); e.metier = true; throw e;
  }
  const abonnement = await stockage.lireAbonnement();
  abonnement.modules[code] = !!corps.actif;
  await stockage.ecrireAbonnement(abonnement);
  return { module: code, actif: abonnement.modules[code], prixTotal: prixCourant(abonnement.modules) };
});

/* ADMIN : appliquer un pack complet */
route('POST', '/api/abonnement/pack/:code', async (p, corps, contexte) => {
  if (!contexte.utilisateur || contexte.utilisateur.role !== 'ADMIN') {
    const e = new Error('Réservé à l\'administrateur du compte'); e.metier = true; throw e;
  }
  const pack = PACKS.find(x => x.code === p.code.toUpperCase());
  if (!pack) { const e = new Error('Pack inconnu'); e.metier = true; throw e; }
  const abonnement = await stockage.lireAbonnement();
  for (const m of MODULES) abonnement.modules[m.code] = pack.modules.includes(m.code);
  abonnement.plan = pack.code;
  await stockage.ecrireAbonnement(abonnement);
  return { plan: pack.code, prixTotal: prixCourant(abonnement.modules) };
});

/* ------------------------------------------------------------
 *  Smoke test — landing page de validation de la demande.
 *
 *  Principe (lean startup) : on mesure l'intérêt RÉEL pour l'offre
 *  (vues de la page + inscriptions à la liste d'attente) avant
 *  d'investir davantage. Aucune donnée sensible : seulement l'email
 *  que le visiteur laisse volontairement, et éventuellement la
 *  formule qui l'intéresse (signal de willingness-to-pay).
 * ------------------------------------------------------------ */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* Beacon de visite (appelé au chargement de la landing) */
route('POST', '/api/smoke/vue', async () => ({ vues: await stockage.compterVue() }));

/* Inscription à la liste d'attente = la « fumée » qu'on mesure */
route('POST', '/api/smoke/interet', async (p, corps) => {
  const email = String(corps.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) { const e = new Error('Adresse e-mail invalide'); e.metier = true; throw e; }
  const formule = ['ESSENTIEL', 'LOGISTIQUE', 'SUITE'].includes(corps.formule) ? corps.formule : null;
  const { deja, total } = await stockage.ajouterProspect(
    { email, formule, langue: corps.langue || 'fr', date: new Date().toISOString() });
  if (deja) return { deja: true, total };
  return { rang: total, total };
});

/* Tableau de bord du smoke test : agrégats de conversion.
 * La liste des emails n'est renvoyée qu'à un ADMIN connecté. */
route('GET', '/api/smoke/metrics', async (p, corps, contexte) => {
  const d = await stockage.lireProspects();
  const vues = d.vues || 0;
  const inscrits = d.prospects.length;
  const parFormule = { ESSENTIEL: 0, LOGISTIQUE: 0, SUITE: 0, SANS: 0 };
  const parJour = {};
  for (const x of d.prospects) {
    parFormule[x.formule || 'SANS']++;
    const jour = x.date.slice(0, 10);
    parJour[jour] = (parJour[jour] || 0) + 1;
  }
  const metrics = {
    vues, inscrits,
    tauxConversion: vues ? Math.round(1000 * inscrits / vues) / 10 : 0,
    parFormule, parJour,
  };
  if (contexte.utilisateur && contexte.utilisateur.role === 'ADMIN') {
    metrics.derniers = d.prospects.slice(-30).reverse();
  }
  return metrics;
});

/* ------------------------------------------------------------
 *  Serveur
 * ------------------------------------------------------------ */
async function gestionnaire(req, res) {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return servirStatique(req, res);

  const correspondance = trouverRoute(req.method, url.pathname);
  if (!correspondance) return repondreJson(res, 404, { erreur: 'Route inconnue' });

  try {
    const corps = (req.method === 'POST' || req.method === 'PUT') ? await lireCorps(req) : {};
    const contexte = { req, res, utilisateur: sessionCourante(req) };
    const resultat = await correspondance.gestionnaire(correspondance.params, corps, contexte);
    repondreJson(res, 200, resultat === undefined ? { ok: true } : resultat);
  } catch (e) {
    repondreJson(res, e.metier ? 400 : 500, { erreur: e.message });
    if (!e.metier) console.error(e);
  }
}

/* Hébergement Vercel : api/index.js exporte le gestionnaire. */
module.exports = { gestionnaire };

if (require.main === module) {
  http.createServer(gestionnaire).listen(PORT, async () => {
    console.log('====================================================');
    console.log('  LM-SUITE — Portail de la suite logistique');
    console.log(`  Accueil : http://localhost:${PORT}/`);
    console.log(`  Smoke test (landing) : http://localhost:${PORT}/smoke.html`);
    console.log(`  Stockage : ${stockage.DESCRIPTION}`);
    const ab = await stockage.lireAbonnement();
    console.log(`  Abonnement : ${planPour(ab.modules)} (${prixCourant(ab.modules)} €/mois)`);
    console.log('====================================================');
  });
}
