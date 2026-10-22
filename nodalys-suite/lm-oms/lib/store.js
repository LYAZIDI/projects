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

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = Database ? path.join(DATA_DIR, 'oms.db') : path.join(DATA_DIR, 'oms.json');

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
  const lignes = sql.prepare(`SELECT * FROM ${nom}`).all();
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

function sauvegarder() {
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

function getDb() { if (!db) charger(); return db; }
function mutate(fn) { const r = fn(getDb()); sauvegarder(); return r; }
function enLot(fn) {
  getDb(); sauvegardeDifferee = true;
  try { fn(); } finally { sauvegardeDifferee = false; }
  sauvegarder();
}
function prochainId(sequence) { return getDb().sequences[sequence]++; }
function reinitialiser() {
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

module.exports = { getDb, mutate, enLot, sauvegarder, prochainId, reinitialiser, DATA_FILE, modeSql: !!Database };
