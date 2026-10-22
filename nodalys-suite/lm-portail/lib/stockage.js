'use strict';
/* ============================================================
 *  Stockage du portail : abonnement + journal du smoke test.
 *
 *  Local : abonnement.json et prospects.json à la racine.
 *  Vercel : base Turso (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN),
 *  avec des écritures atomiques (compteur de vues incrémenté en
 *  SQL, prospects en table, l'email en clé) pour ne rien perdre
 *  quand plusieurs instances écrivent en même temps.
 * ============================================================ */

const fs = require('fs');
const path = require('path');
const turso = require('./turso').depuisEnv();

const FICHIER_ABONNEMENT = path.join(__dirname, '..', 'abonnement.json');
const FICHIER_PROSPECTS = path.join(__dirname, '..', 'prospects.json');

/* ---------- Local (fichiers) ---------- */
function lireFichierProspects() {
  try { return JSON.parse(fs.readFileSync(FICHIER_PROSPECTS, 'utf8')); }
  catch { return { vues: 0, prospects: [] }; }
}
function ecrireFichierProspects(donnees) {
  fs.writeFileSync(FICHIER_PROSPECTS, JSON.stringify(donnees, null, 2), 'utf8');
}

const local = {
  async lireAbonnement() {
    return JSON.parse(fs.readFileSync(FICHIER_ABONNEMENT, 'utf8'));
  },
  async ecrireAbonnement(abonnement) {
    fs.writeFileSync(FICHIER_ABONNEMENT, JSON.stringify(abonnement, null, 2), 'utf8');
  },
  async compterVue() {
    const d = lireFichierProspects();
    d.vues = (d.vues || 0) + 1;
    ecrireFichierProspects(d);
    return d.vues;
  },
  async ajouterProspect(prospect) {
    const d = lireFichierProspects();
    if (d.prospects.find(x => x.email === prospect.email)) return { deja: true, total: d.prospects.length };
    d.prospects.push(prospect);
    ecrireFichierProspects(d);
    return { deja: false, total: d.prospects.length };
  },
  async lireProspects() {
    return lireFichierProspects();
  },
};

/* ---------- Turso ---------- */
let schemaPret = false;
async function preparer() {
  if (schemaPret) return;
  /* abonnement initial = celui livré avec l'application */
  const abonnementInitial = fs.readFileSync(FICHIER_ABONNEMENT, 'utf8');
  await turso.executer([
    ['CREATE TABLE IF NOT EXISTS documents (nom TEXT PRIMARY KEY, valeur TEXT NOT NULL)'],
    ['CREATE TABLE IF NOT EXISTS compteurs (nom TEXT PRIMARY KEY, valeur INTEGER NOT NULL)'],
    ['CREATE TABLE IF NOT EXISTS prospects (email TEXT PRIMARY KEY, formule TEXT, langue TEXT, date TEXT)'],
    ["INSERT OR IGNORE INTO documents (nom, valeur) VALUES ('abonnement', ?)", [abonnementInitial]],
    ["INSERT OR IGNORE INTO compteurs (nom, valeur) VALUES ('vues', 0)"],
  ]);
  schemaPret = true;
}

const distant = {
  async lireAbonnement() {
    await preparer();
    const [[ligne]] = await turso.executer([["SELECT valeur FROM documents WHERE nom = 'abonnement'"]]);
    return JSON.parse(ligne.valeur);
  },
  async ecrireAbonnement(abonnement) {
    await preparer();
    await turso.executer([["UPDATE documents SET valeur = ? WHERE nom = 'abonnement'", [JSON.stringify(abonnement)]]]);
  },
  async compterVue() {
    await preparer();
    const [, [ligne]] = await turso.executer([
      ["UPDATE compteurs SET valeur = valeur + 1 WHERE nom = 'vues'"],
      ["SELECT valeur FROM compteurs WHERE nom = 'vues'"],
    ]);
    return ligne.valeur;
  },
  async ajouterProspect(prospect) {
    await preparer();
    const [, [ajout], [{ total }]] = await turso.executer([
      ['INSERT OR IGNORE INTO prospects (email, formule, langue, date) VALUES (?, ?, ?, ?)',
        [prospect.email, prospect.formule, prospect.langue, prospect.date]],
      ['SELECT changes() AS n'],
      ['SELECT COUNT(*) AS total FROM prospects'],
    ]);
    return { deja: ajout.n === 0, total };
  },
  async lireProspects() {
    await preparer();
    const [[vues], prospects] = await turso.executer([
      ["SELECT valeur FROM compteurs WHERE nom = 'vues'"],
      ['SELECT email, formule, langue, date FROM prospects ORDER BY date'],
    ]);
    return { vues: vues.valeur, prospects };
  },
};

module.exports = { ...(turso ? distant : local), DESCRIPTION: turso ? `Turso ${process.env.TURSO_DATABASE_URL}` : 'fichiers JSON locaux' };
