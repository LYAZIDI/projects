'use strict';
/* ============================================================
 *  Store LM-OMS - persistance SQLite (data/oms.db), repli JSON.
 *  Base propre à l'OMS ; clients synchronisés depuis le WMS.
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
  : Database ? path.join(DATA_DIR, 'oms.db') : path.join(DATA_DIR, 'oms.json');

function baseVide() {
  return {
    canaux: [],      // {code, nom, regleTransporteur, prioriteDefaut, actif}
    clients: [],     // {code, nom, ville, adresse}  (sync WMS)
    commandes: [],   // {id, numero, canal, client, statut, lignes, poidsEstime, transporteurChoisi, ...}
    sequences: { commande: 1 },
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS canaux (
  code TEXT PRIMARY KEY, nom TEXT, regleTransporteur TEXT,
  prioriteDefaut INTEGER, actif INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS clients (
  code TEXT PRIMARY KEY, nom TEXT, ville TEXT, adresse TEXT);
CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY, numero TEXT, canal TEXT, client TEXT,
  dateCreation TEXT, dateLivraisonSouhaitee TEXT, priorite INTEGER,
  statut TEXT, lignes TEXT, manquants TEXT, poidsEstime REAL,
  transporteurChoisi TEXT, motifTransporteur TEXT, coutTransportEstime REAL,
  wmsNumero TEXT, wmsStatut TEXT, tmsExpedition TEXT, tmsStatut TEXT,
  dateLivraisonReelle TEXT);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE TABLE IF NOT EXISTS sequences (nom TEXT PRIMARY KEY, valeur INTEGER);
`;

const COLONNES_JSON = { commandes: ['lignes', 'manquants'] };
const COLONNES_BOOL = { canaux: ['actif'] };
const TABLES = ['canaux', 'clients', 'commandes'];

let db = null;
let sql = null;
let sauvegardeDifferee = false;

function ouvrirSql() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  sql = new Database(DATA_FILE);
  sql.pragma('journal_mode = WAL');
  sql.exec(SCHEMA);
}

function lireTable(nom) {
  return normaliser(nom, sql.prepare(`SELECT * FROM ${nom}`).all());
}

/* Lignes SQL -> objets du domaine (JSON parsé, booléens, null retirés) */
function normaliser(nom, lignes) {
  for (const ligne of lignes) {
    for (const c of COLONNES_JSON[nom] || []) ligne[c] = JSON.parse(ligne[c] || 'null');
    for (const c of COLONNES_BOOL[nom] || []) ligne[c] = !!ligne[c];
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
  for (const ligne of lignes) {
    const rangee = {};
    for (const c of colonnes) {
      let v = ligne[c];
      if ((COLONNES_JSON[nom] || []).includes(c)) v = JSON.stringify(v ?? null);
      else if (typeof v === 'boolean') v = v ? 1 : 0;
      rangee[c] = v === undefined ? null : v;
    }
    insertion.run(rangee);
  }
}

function charger() {
  if (Database) {
    ouvrirSql();
    db = baseVide();
    for (const table of TABLES) db[table] = lireTable(table);
    for (const s of sql.prepare('SELECT nom, valeur FROM sequences').all()) db.sequences[s.nom] = s.valeur;
  } else if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } else {
    db = baseVide();
  }
  return db;
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
  for (const t of TABLES) {
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
    [LIRE_VERSION], ...TABLES.map(t => [`SELECT * FROM ${t}`]), ['SELECT nom, valeur FROM sequences'],
  ]);
  db = baseVide();
  TABLES.forEach((t, i) => { db[t] = normaliser(t, tables[i]); });
  for (const s of tables[TABLES.length]) db.sequences[s.nom] = s.valeur;
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
  for (const t of TABLES) {
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

function sauvegarder() {
  if (turso) { sale = true; return; }
  if (sauvegardeDifferee) return;
  if (Database) {
    const transaction = sql.transaction(() => {
      for (const table of TABLES) ecrireTable(table, db[table]);
      const maj = sql.prepare('INSERT OR REPLACE INTO sequences (nom, valeur) VALUES (?, ?)');
      for (const [nom, valeur] of Object.entries(db.sequences)) maj.run(nom, valeur);
    });
    transaction();
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 1), 'utf8');
  }
}

function getDb() {
  if (turso && !db) throw new Error('Mode Turso : store.preparer() doit être appelé avant getDb()');
  if (!db) charger();
  return db;
}
function mutate(fn) { const r = fn(getDb()); sauvegarder(); return r; }
function enLot(fn) {
  getDb(); sauvegardeDifferee = true;
  try { fn(); } finally { sauvegardeDifferee = false; }
  sauvegarder();
}
function prochainId(sequence) { return getDb().sequences[sequence]++; }
function reinitialiser() {
  if (turso) {
    if (!db) throw new Error('Mode Turso : store.preparer() doit être appelé avant reinitialiser()');
    db = baseVide();
    sale = true;
    return db;
  }
  db = baseVide();
  if (Database) {
    if (!sql) ouvrirSql();
    sql.exec('BEGIN');
    for (const table of [...TABLES, 'sequences']) sql.exec(`DELETE FROM ${table}`);
    sql.exec('COMMIT');
  }
  sauvegarder();
  return db;
}

module.exports = {
  getDb, mutate, enLot, sauvegarder, prochainId, reinitialiser,
  preparer, valider, abandonner, enSerie,
  DATA_FILE, modeSql: !!Database, modeTurso: !!turso,
};
