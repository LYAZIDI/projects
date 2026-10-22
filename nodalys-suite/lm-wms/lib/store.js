'use strict';
/* ============================================================
 *  Store - persistance SQLite (better-sqlite3) avec repli JSON.
 *
 *  La base data/wms.db contient de vraies tables requêtables en
 *  SQL (articles, stock, mouvements, commandes...). Les listes
 *  imbriquées (lignes de commande, contenu de colis...) sont
 *  stockées en colonnes JSON.
 *
 *  Le domaine travaille sur une image mémoire (mêmes structures
 *  qu'avant) ; chaque mutation est réécrite en base dans une
 *  transaction. Le journal des mouvements, en append-only, est
 *  inséré de façon incrémentale. Architecture mono-processus
 *  assumée (un seul serveur ouvre la base).
 * ============================================================ */

const fs = require('fs');
const path = require('path');

let Database = null;
try {
  Database = require('better-sqlite3');
  // Le binding natif ne se charge qu'à l'instanciation : on le vérifie
  // tout de suite pour basculer en repli JSON si le module est présent
  // mais incompatible (ex. compilé pour une autre version de Node).
  new Database(':memory:').close();
} catch { Database = null; /* repli JSON */ }

/* Mode Turso (hébergement Vercel) : prioritaire si configuré */
const turso = require('./turso').depuisEnv();
if (turso) Database = null;

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = turso ? `Turso ${process.env.TURSO_DATABASE_URL}`
  : Database ? path.join(DATA_DIR, 'wms.db') : path.join(DATA_DIR, 'wms.json');

/* Structure vide de la base */
function baseVide() {
  return {
    articles: [], emplacements: [], tiers: [], transporteurs: [],
    stock: [], mouvements: [], attendus: [], commandes: [],
    vagues: [], missions: [], colis: [], chargements: [], inventaires: [],
    utilisateurs: [], supports: [], echangesEdi: [],
    sequences: { attendu: 1, commande: 1, vague: 1, mission: 1, stock: 1,
                 mouvement: 1, colis: 1, sscc: 1, chargement: 1, inventaire: 1,
                 support: 1, echange: 1 },
  };
}

let db = null;              // image mémoire
let sql = null;             // connexion better-sqlite3
let dernierMouvementSauve = 0;
let sauvegardeDifferee = false;

/* ---------- Schéma SQL ----------
 * bool -> INTEGER 0/1, listes imbriquées -> TEXT JSON.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS articles (
  code TEXT PRIMARY KEY, designation TEXT, ean TEXT, pcb INTEGER,
  gereLot INTEGER, gereDLC INTEGER, classeRotation TEXT,
  emplacementPicking TEXT, stockMiniPicking INTEGER, poidsUnitaire REAL);
CREATE TABLE IF NOT EXISTS emplacements (
  code TEXT PRIMARY KEY, zone TEXT, allee TEXT, type TEXT,
  capacite INTEGER, bloque INTEGER);
CREATE TABLE IF NOT EXISTS tiers (
  code TEXT PRIMARY KEY, nom TEXT, type TEXT, adresse TEXT, ville TEXT);
CREATE TABLE IF NOT EXISTS transporteurs (code TEXT PRIMARY KEY, nom TEXT);
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY, article TEXT, emplacement TEXT, lot TEXT, dlc TEXT,
  qte INTEGER, qteReservee INTEGER, dateEntree TEXT, statut TEXT, support TEXT);
CREATE INDEX IF NOT EXISTS idx_stock_article ON stock(article);
CREATE INDEX IF NOT EXISTS idx_stock_emplacement ON stock(emplacement);
CREATE TABLE IF NOT EXISTS mouvements (
  id INTEGER PRIMARY KEY, date TEXT, type TEXT, article TEXT, lot TEXT,
  qte INTEGER, source TEXT, dest TEXT, operateur TEXT, reference TEXT);
CREATE INDEX IF NOT EXISTS idx_mouvements_date ON mouvements(date);
CREATE TABLE IF NOT EXISTS attendus (
  id INTEGER PRIMARY KEY, numero TEXT, fournisseur TEXT, datePrevue TEXT,
  statut TEXT, dateCreation TEXT, lignes TEXT, referenceExterne TEXT);
CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY, numero TEXT, client TEXT, priorite INTEGER,
  dateCreation TEXT, dateLivraison TEXT, transporteur TEXT, statut TEXT,
  rupture INTEGER, vague INTEGER, lignes TEXT, referenceExterne TEXT);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE TABLE IF NOT EXISTS vagues (
  id INTEGER PRIMARY KEY, numero TEXT, dateCreation TEXT, statut TEXT,
  commandes TEXT, missions TEXT);
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY, type TEXT, statut TEXT, article TEXT, lot TEXT,
  dlc TEXT, qte INTEGER, source TEXT, dest TEXT, vague INTEGER,
  commande INTEGER, ordre INTEGER, operateur TEXT, dateCreation TEXT,
  reference TEXT, stockId INTEGER, qteValidee INTEGER, dateFin TEXT, support TEXT);
CREATE INDEX IF NOT EXISTS idx_missions_type_statut ON missions(type, statut);
CREATE TABLE IF NOT EXISTS colis (
  id INTEGER PRIMARY KEY, sscc TEXT, commande INTEGER, statut TEXT,
  lignes TEXT, dateCreation TEXT);
CREATE TABLE IF NOT EXISTS chargements (
  id INTEGER PRIMARY KEY, numero TEXT, transporteur TEXT, statut TEXT,
  colis TEXT, dateCreation TEXT, dateDepart TEXT);
CREATE TABLE IF NOT EXISTS inventaires (
  id INTEGER PRIMARY KEY, numero TEXT, emplacement TEXT, statut TEXT,
  dateCreation TEXT, dateValidation TEXT, operateur TEXT, lignes TEXT);
CREATE TABLE IF NOT EXISTS utilisateurs (
  code TEXT PRIMARY KEY, nom TEXT, role TEXT, mdpHash TEXT, actif INTEGER);
CREATE TABLE IF NOT EXISTS supports (
  id INTEGER PRIMARY KEY, sscc TEXT, type TEXT, emplacement TEXT,
  statut TEXT, dateCreation TEXT);
CREATE INDEX IF NOT EXISTS idx_supports_sscc ON supports(sscc);
CREATE TABLE IF NOT EXISTS echangesEdi (
  id INTEGER PRIMARY KEY, date TEXT, sens TEXT, type TEXT, fichier TEXT,
  statut TEXT, message TEXT, nbLignes INTEGER);
CREATE TABLE IF NOT EXISTS sequences (nom TEXT PRIMARY KEY, valeur INTEGER);
`;

/* Colonnes JSON par table (sérialisées à l'écriture, parsées à la lecture) */
const COLONNES_JSON = {
  attendus: ['lignes'], commandes: ['lignes'], vagues: ['commandes', 'missions'],
  colis: ['lignes'], chargements: ['colis'], inventaires: ['lignes'],
};
/* Colonnes booléennes (INTEGER 0/1 en base) */
const COLONNES_BOOL = {
  articles: ['gereLot', 'gereDLC'], emplacements: ['bloque'], commandes: ['rupture'],
  utilisateurs: ['actif'],
};

const TABLES = ['articles', 'emplacements', 'tiers', 'transporteurs', 'stock',
                'attendus', 'commandes', 'vagues', 'missions', 'colis',
                'chargements', 'inventaires', 'utilisateurs', 'supports', 'echangesEdi'];

/* Colonnes ajoutées après la première version du schéma : on les
 * crée si la base existante ne les a pas (ALTER échoue sans risque
 * si la colonne est déjà là). */
const MIGRATIONS = [
  'ALTER TABLE stock ADD COLUMN support TEXT',
  'ALTER TABLE missions ADD COLUMN support TEXT',
  'ALTER TABLE commandes ADD COLUMN referenceExterne TEXT',
  'ALTER TABLE attendus ADD COLUMN referenceExterne TEXT',
];

function ouvrirSql() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  sql = new Database(DATA_FILE);
  sql.pragma('journal_mode = WAL');
  sql.exec(SCHEMA);
  for (const migration of MIGRATIONS) {
    try { sql.exec(migration); } catch { /* colonne déjà présente */ }
  }
}

function lireTable(nom) {
  return normaliser(nom, sql.prepare(`SELECT * FROM ${nom}`).all());
}

/* Lignes SQL -> objets du domaine (JSON parsé, booléens, null retirés) */
function normaliser(nom, lignes) {
  const colonnesJson = COLONNES_JSON[nom] || [];
  const colonnesBool = COLONNES_BOOL[nom] || [];
  for (const ligne of lignes) {
    for (const c of colonnesJson) ligne[c] = JSON.parse(ligne[c] || 'null');
    for (const c of colonnesBool) ligne[c] = !!ligne[c];
    for (const cle of Object.keys(ligne)) if (ligne[cle] === null) delete ligne[cle];
  }
  return lignes;
}

function ecrireTable(nom, lignes) {
  sql.prepare(`DELETE FROM ${nom}`).run();
  if (lignes.length === 0) return;
  const colonnes = [...new Set(lignes.flatMap(l => Object.keys(l)))];
  const insertion = sql.prepare(
    `INSERT INTO ${nom} (${colonnes.join(',')}) VALUES (${colonnes.map(c => '@' + c).join(',')})`);
  const colonnesJson = COLONNES_JSON[nom] || [];
  for (const ligne of lignes) {
    const rangee = {};
    for (const c of colonnes) {
      let v = ligne[c];
      if (colonnesJson.includes(c)) v = JSON.stringify(v ?? null);
      else if (typeof v === 'boolean') v = v ? 1 : 0;
      rangee[c] = v === undefined ? null : v;
    }
    insertion.run(rangee);
  }
}

function chargerSql() {
  ouvrirSql();
  db = baseVide();
  for (const table of TABLES) db[table] = lireTable(table);
  for (const s of sql.prepare('SELECT nom, valeur FROM sequences').all()) {
    db.sequences[s.nom] = s.valeur;
  }
  db.mouvements = lireTable('mouvements');
  dernierMouvementSauve = db.mouvements.reduce((max, m) => Math.max(max, m.id), 0);
}

const sauvegarderSql = () => {
  const transaction = sql.transaction(() => {
    for (const table of TABLES) ecrireTable(table, db[table]);
    /* mouvements : append-only, insertion incrémentale */
    const nouveaux = db.mouvements.filter(m => m.id > dernierMouvementSauve);
    if (nouveaux.length) {
      const insertion = sql.prepare(
        `INSERT INTO mouvements (id, date, type, article, lot, qte, source, dest, operateur, reference)
         VALUES (@id, @date, @type, @article, @lot, @qte, @source, @dest, @operateur, @reference)`);
      for (const m of nouveaux) insertion.run(m);
      dernierMouvementSauve = nouveaux[nouveaux.length - 1].id;
    }
    const majSequence = sql.prepare('INSERT OR REPLACE INTO sequences (nom, valeur) VALUES (?, ?)');
    for (const [nom, valeur] of Object.entries(db.sequences)) majSequence.run(nom, valeur);
  });
  transaction();
};

/* ---------- Repli JSON (si better-sqlite3 absent) ---------- */
function chargerJson() {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const ref = baseVide();
    for (const k of Object.keys(ref)) if (db[k] === undefined) db[k] = ref[k];
  } else {
    db = baseVide();
  }
}
function sauvegarderJson() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 1), 'utf8');
}

/* ---------- Mode Turso (Vercel) ----------
 * Même schéma que SQLite. Le domaine garde son image mémoire
 * synchrone ; le serveur encadre chaque requête par :
 *  - preparer() : recharge l'image si une autre instance a écrit
 *    entre-temps (numéro de version dans la table meta) ;
 *  - valider()  : écrit seulement les lignes modifiées, en une
 *    transaction, avec verrou optimiste sur la version (si une
 *    autre instance a écrit, erreur `conflit` et rien n'est écrit).
 */
const COLONNES = {};   // table -> colonnes, dans l'ordre du schéma
const CLES = {};       // table -> clé primaire
for (const [, table, definitions] of SCHEMA.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([^;]*?)\);/g)) {
  const colonnes = definitions.split(',').map(c => c.trim()).filter(Boolean);
  COLONNES[table] = colonnes.map(c => c.split(/\s+/)[0]);
  CLES[table] = colonnes.find(c => /PRIMARY KEY/.test(c)).split(/\s+/)[0];
}
const TABLES_TURSO = [...TABLES, 'mouvements'];
const LIRE_VERSION = "SELECT valeur FROM meta WHERE nom = 'version'";

let schemaPret = false;
let versionChargee = null;
let empreintes = {};     // table -> Map(clé -> rangée sérialisée), état connu en base
let sale = false;

function versRangee(nom, ligne) {
  const colonnesJson = COLONNES_JSON[nom] || [];
  return COLONNES[nom].map(c => {
    let v = ligne[c];
    if (colonnesJson.includes(c)) v = JSON.stringify(v ?? null);
    else if (typeof v === 'boolean') v = v ? 1 : 0;
    return v === undefined ? null : v;
  });
}

function empreintesDe(image) {
  const resultat = {};
  for (const t of TABLES_TURSO) {
    resultat[t] = new Map(image[t].map(l => [l[CLES[t]], JSON.stringify(versRangee(t, l))]));
  }
  resultat.sequences = new Map(Object.entries(image.sequences));
  return resultat;
}

async function preparerTurso() {
  let version;
  if (!schemaPret) {
    const creations = SCHEMA.split(';').map(s => s.trim()).filter(Boolean).map(s => [s]);
    const resultats = await turso.executer([
      ...creations,
      ['CREATE TABLE IF NOT EXISTS meta (nom TEXT PRIMARY KEY, valeur INTEGER NOT NULL)'],
      ["INSERT OR IGNORE INTO meta (nom, valeur) VALUES ('version', 0)"],
      [LIRE_VERSION],
    ]);
    version = resultats[resultats.length - 1][0].valeur;
    schemaPret = true;
  } else {
    version = (await turso.executer([[LIRE_VERSION]]))[0][0].valeur;
  }
  if (db && version === versionChargee) return;

  const [[{ valeur }], ...tables] = await turso.transaction([
    [LIRE_VERSION], ...TABLES_TURSO.map(t => [`SELECT * FROM ${t}`]), ['SELECT nom, valeur FROM sequences'],
  ]);
  db = baseVide();
  TABLES_TURSO.forEach((t, i) => { db[t] = normaliser(t, tables[i]); });
  for (const s of tables[TABLES_TURSO.length]) db.sequences[s.nom] = s.valeur;
  empreintes = empreintesDe(db);
  versionChargee = valeur;
  sale = false;
}

async function validerTurso() {
  if (!sale) return;
  const requetes = [[
    "UPDATE meta SET valeur = CASE WHEN valeur = ? THEN valeur + 1 ELSE NULL END WHERE nom = 'version'",
    [versionChargee],
  ]];
  const nouvelles = empreintesDe(db);
  for (const t of TABLES_TURSO) {
    const avant = empreintes[t] || new Map();
    const insertion = `INSERT OR REPLACE INTO ${t} (${COLONNES[t].join(',')}) VALUES (${COLONNES[t].map(() => '?').join(',')})`;
    for (const [cle, empreinte] of nouvelles[t]) {
      if (avant.get(cle) !== empreinte) requetes.push([insertion, JSON.parse(empreinte)]);
    }
    for (const cle of avant.keys()) {
      if (!nouvelles[t].has(cle)) requetes.push([`DELETE FROM ${t} WHERE ${CLES[t]} = ?`, [cle]]);
    }
  }
  const sequencesAvant = empreintes.sequences || new Map();
  for (const [nom, valeur] of nouvelles.sequences) {
    if (sequencesAvant.get(nom) !== valeur) {
      requetes.push(['INSERT OR REPLACE INTO sequences (nom, valeur) VALUES (?, ?)', [nom, valeur]]);
    }
  }
  if (requetes.length === 1) { sale = false; return; }

  try {
    await turso.transaction(requetes);
  } catch (e) {
    abandonner();
    if (e.etape !== 0) throw e;
    const conflit = new Error("La base a été modifiée par ailleurs pendant l'opération");
    conflit.conflit = true;
    throw conflit;
  }
  empreintes = nouvelles;
  versionChargee++;
  sale = false;
}

/* ---------- API commune ---------- */
function charger() { Database ? chargerSql() : chargerJson(); return db; }

function sauvegarder() {
  if (turso) { sale = true; return; }
  if (sauvegardeDifferee) return;
  Database ? sauvegarderSql() : sauvegarderJson();
}

function getDb() {
  if (turso && !db) throw new Error('Mode Turso : store.preparer() doit être appelé avant getDb()');
  if (!db) charger();
  return db;
}

/* Début de requête : charge (ou rafraîchit) l'image mémoire. */
async function preparer() {
  if (turso) await preparerTurso();
  else getDb();
}

/* Fin de requête : persiste les modifications (no-op en local,
 * où chaque mutation est déjà écrite). */
async function valider() {
  if (turso) await validerTurso();
}

/* Après une erreur en cours de requête : l'image mémoire a pu être
 * modifiée à moitié, on la recharge à la prochaine requête. */
function abandonner() {
  if (turso && sale) { versionChargee = null; sale = false; }
}

/* Une instance traite ses requêtes une par une (l'image mémoire
 * est partagée entre requêtes concurrentes sur Vercel). */
let fileAttente = Promise.resolve();
function enSerie(fn) {
  const resultat = fileAttente.then(fn, fn);
  fileAttente = resultat.catch(() => {});
  return resultat;
}

/* Exécute une mutation puis persiste. Renvoie le résultat de fn. */
function mutate(fn) {
  const resultat = fn(getDb());
  sauvegarder();
  return resultat;
}

/* Enchaîne un grand nombre de mutations avec UNE seule écriture en
 * base à la fin (indispensable pour la génération de données). */
function enLot(fn) {
  getDb();
  sauvegardeDifferee = true;
  try { fn(); } finally { sauvegardeDifferee = false; }
  sauvegarder();
}

function prochainNumero(prefixe, sequence) {
  const n = getDb().sequences[sequence]++;
  return prefixe + String(n).padStart(6, '0');
}

function prochainId(sequence) {
  return getDb().sequences[sequence]++;
}

/* Réinitialise complètement la base */
function reinitialiser() {
  if (turso) {
    if (!db) throw new Error('Mode Turso : store.preparer() doit être appelé avant reinitialiser()');
    db = baseVide();
    sale = true;
    return db;
  }
  db = baseVide();
  dernierMouvementSauve = 0;
  if (Database) {
    if (!sql) ouvrirSql();
    sql.exec('BEGIN');
    for (const table of [...TABLES, 'mouvements', 'sequences']) sql.exec(`DELETE FROM ${table}`);
    sql.exec('COMMIT');
  }
  sauvegarder();
  return db;
}

module.exports = {
  getDb, mutate, enLot, sauvegarder, prochainNumero, prochainId, reinitialiser,
  preparer, valider, abandonner, enSerie,
  DATA_FILE, modeSql: !!Database, modeTurso: !!turso,
};
