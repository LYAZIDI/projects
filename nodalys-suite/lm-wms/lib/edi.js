'use strict';
/* ============================================================
 *  Connecteur EDI simplifié - échanges par fichiers CSV à plat,
 *  comme les interfaces classiques d'un WMS avec un ERP/e-commerce.
 *
 *  Flux ENTRANTS (déposés dans edi/entrant/) :
 *    commandes_*.csv   numeroExterne;client;dateLivraison;transporteur;priorite;article;qte
 *    attendus_*.csv    numeroExterne;fournisseur;datePrevue;article;qtePrevue
 *  (une ligne CSV par ligne de commande/d'attendu, groupées par
 *   numeroExterne ; doublons rejetés grâce à la référence externe)
 *
 *  Flux SORTANTS (produits dans edi/sortant/) :
 *    DESADV  avis d'expédition, émis au départ d'un chargement
 *    RECADV  confirmation de réception, émise à la clôture d'un attendu
 *    INVRPT  photo du stock, à la demande
 *
 *  Chaque échange est journalisé en base (table echangesEdi).
 * ============================================================ */

const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('./store');
const d = require('./domaine');

/* Sur Vercel seul le répertoire temporaire est inscriptible : les
 * fichiers y sont éphémères, le journal des échanges reste en base. */
const RACINE = process.env.VERCEL ? path.join(os.tmpdir(), 'lm-wms-edi') : path.join(__dirname, '..', 'edi');
const REPERTOIRES = {
  entrant: path.join(RACINE, 'entrant'),
  sortant: path.join(RACINE, 'sortant'),
  archive: path.join(RACINE, 'archive'),
  erreur: path.join(RACINE, 'erreur'),
  exemples: path.join(RACINE, 'exemples'),
};

function initialiser() {
  for (const repertoire of Object.values(REPERTOIRES)) {
    fs.mkdirSync(repertoire, { recursive: true });
  }
  ecrireExemples();
}

function horodatage() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

function journaliser(sens, type, fichier, statut, message, nbLignes) {
  store.mutate(db => {
    db.echangesEdi.push({
      id: db.sequences.echange++,
      date: new Date().toISOString(),
      sens, type, fichier, statut, message: message || '', nbLignes: nbLignes || 0,
    });
    if (db.echangesEdi.length > 1000) db.echangesEdi.splice(0, db.echangesEdi.length - 1000);
  });
}

/* ---------- CSV ---------- */
function parserCsv(contenu) {
  const lignes = contenu.replace(/^﻿/, '').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lignes.length < 2) return [];
  const entetes = lignes[0].split(';').map(e => e.trim());
  return lignes.slice(1).map(ligne => {
    const valeurs = ligne.split(';');
    const objet = {};
    entetes.forEach((entete, i) => { objet[entete] = (valeurs[i] || '').trim(); });
    return objet;
  });
}

function ecrireCsv(chemin, entetes, lignes) {
  const contenu = '﻿' + entetes.join(';') + '\n'
    + lignes.map(l => entetes.map(e => l[e] ?? '').join(';')).join('\n') + '\n';
  fs.writeFileSync(chemin, contenu, 'utf8');
}

/* ---------- Imports ---------- */

function grouperPar(lignes, cle) {
  const groupes = new Map();
  for (const ligne of lignes) {
    const valeur = ligne[cle] || '(sans reference)';
    if (!groupes.has(valeur)) groupes.set(valeur, []);
    groupes.get(valeur).push(ligne);
  }
  return groupes;
}

function importerCommandes(lignesCsv) {
  const erreurs = [];
  let creees = 0;
  for (const [reference, lignes] of grouperPar(lignesCsv, 'numeroExterne')) {
    try {
      const premiere = lignes[0];
      d.commandeCreer({
        referenceExterne: reference,
        client: premiere.client,
        dateLivraison: premiere.dateLivraison || '',
        transporteur: premiere.transporteur || '',
        priorite: Number(premiere.priorite) || 5,
        lignes: lignes.map(l => ({ article: l.article, qte: Number(l.qte) })),
      });
      creees++;
    } catch (e) {
      erreurs.push(`${reference} : ${e.message}`);
    }
  }
  return { creees, erreurs, libelle: 'commande(s)' };
}

function importerAttendus(lignesCsv) {
  const erreurs = [];
  let creees = 0;
  for (const [reference, lignes] of grouperPar(lignesCsv, 'numeroExterne')) {
    try {
      const premiere = lignes[0];
      d.attenduCreer({
        referenceExterne: reference,
        fournisseur: premiere.fournisseur,
        datePrevue: premiere.datePrevue || '',
        lignes: lignes.map(l => ({ article: l.article, qtePrevue: Number(l.qtePrevue) })),
      });
      creees++;
    } catch (e) {
      erreurs.push(`${reference} : ${e.message}`);
    }
  }
  return { creees, erreurs, libelle: 'attendu(s)' };
}

/* Traite tous les fichiers présents dans edi/entrant/. */
function scannerEntrant() {
  initialiser();
  const resultats = [];
  const fichiers = fs.readdirSync(REPERTOIRES.entrant).filter(f => f.toLowerCase().endsWith('.csv'));
  for (const fichier of fichiers) {
    const chemin = path.join(REPERTOIRES.entrant, fichier);
    const nom = fichier.toLowerCase();
    let type, importer;
    if (nom.startsWith('commandes')) { type = 'ORDERS'; importer = importerCommandes; }
    else if (nom.startsWith('attendus')) { type = 'ASN'; importer = importerAttendus; }
    else {
      fs.renameSync(chemin, path.join(REPERTOIRES.erreur, fichier));
      journaliser('ENTRANT', 'INCONNU', fichier, 'ERREUR',
        'Nom de fichier non reconnu (attendu : commandes_*.csv ou attendus_*.csv)', 0);
      resultats.push({ fichier, statut: 'ERREUR' });
      continue;
    }

    let bilan;
    try {
      bilan = importer(parserCsv(fs.readFileSync(chemin, 'utf8')));
    } catch (e) {
      bilan = { creees: 0, erreurs: ['Fichier illisible : ' + e.message], libelle: '' };
    }

    const statut = bilan.erreurs.length === 0 ? 'OK' : (bilan.creees > 0 ? 'PARTIEL' : 'ERREUR');
    const destination = statut === 'ERREUR' ? REPERTOIRES.erreur : REPERTOIRES.archive;
    const cible = path.join(destination, horodatage() + '_' + fichier);
    fs.renameSync(chemin, cible);
    if (bilan.erreurs.length > 0) {
      fs.writeFileSync(cible + '.log', bilan.erreurs.join('\n') + '\n', 'utf8');
    }
    const message = `${bilan.creees} ${bilan.libelle} créée(s)`
      + (bilan.erreurs.length ? `, ${bilan.erreurs.length} rejet(s)` : '');
    journaliser('ENTRANT', type, fichier, statut, message, bilan.creees);
    resultats.push({ fichier, statut, message });
  }
  return resultats;
}

/* ---------- Exports ---------- */

/* DESADV : un fichier par commande expédiée au départ du chargement */
function exporterDesadv(chargement) {
  initialiser();
  const db = store.getDb();
  const fichiers = [];
  const commandesTouchees = new Set(
    chargement.colis.map(sscc => db.colis.find(c => c.sscc === sscc)?.commande).filter(Boolean));

  for (const commandeId of commandesTouchees) {
    const commande = db.commandes.find(c => c.id === commandeId);
    if (!commande || commande.statut !== 'EXPEDIEE') continue;
    const lignes = [];
    for (const colis of db.colis.filter(c => c.commande === commandeId)) {
      for (const ligne of colis.lignes) {
        lignes.push({
          commande: commande.numero, referenceExterne: commande.referenceExterne,
          client: commande.client, transporteur: chargement.transporteur,
          chargement: chargement.numero, sscc: colis.sscc,
          article: ligne.article, qte: ligne.qte,
          dateExpedition: chargement.dateDepart,
        });
      }
    }
    const fichier = `desadv_${commande.numero}_${horodatage()}.csv`;
    ecrireCsv(path.join(REPERTOIRES.sortant, fichier),
      ['commande', 'referenceExterne', 'client', 'transporteur', 'chargement',
       'sscc', 'article', 'qte', 'dateExpedition'], lignes);
    journaliser('SORTANT', 'DESADV', fichier, 'OK',
      `Avis d'expédition ${commande.numero} (${lignes.length} lignes)`, lignes.length);
    fichiers.push(fichier);
  }
  return fichiers;
}

/* RECADV : confirmation de réception à la clôture d'un attendu */
function exporterRecadv(attendu) {
  initialiser();
  const lignes = attendu.lignes.map(l => ({
    attendu: attendu.numero, referenceExterne: attendu.referenceExterne,
    fournisseur: attendu.fournisseur, article: l.article,
    qtePrevue: l.qtePrevue, qteRecue: l.qteRecue,
    dateCloture: new Date().toISOString(),
  }));
  const fichier = `recadv_${attendu.numero}_${horodatage()}.csv`;
  ecrireCsv(path.join(REPERTOIRES.sortant, fichier),
    ['attendu', 'referenceExterne', 'fournisseur', 'article', 'qtePrevue', 'qteRecue', 'dateCloture'],
    lignes);
  journaliser('SORTANT', 'RECADV', fichier, 'OK',
    `Confirmation de réception ${attendu.numero}`, lignes.length);
  return fichier;
}

/* INVRPT : photo complète du stock */
function exporterInvrpt() {
  initialiser();
  const db = store.getDb();
  const lignes = db.stock.map(s => {
    const article = db.articles.find(a => a.code === s.article) || {};
    const emplacement = db.emplacements.find(e => e.code === s.emplacement) || {};
    return {
      article: s.article, designation: article.designation || '',
      emplacement: s.emplacement, zone: emplacement.zone || '',
      lot: s.lot, dlc: s.dlc, qte: s.qte, qteReservee: s.qteReservee,
      statut: s.statut, support: s.support || '',
    };
  });
  const fichier = `invrpt_${horodatage()}.csv`;
  ecrireCsv(path.join(REPERTOIRES.sortant, fichier),
    ['article', 'designation', 'emplacement', 'zone', 'lot', 'dlc',
     'qte', 'qteReservee', 'statut', 'support'], lignes);
  journaliser('SORTANT', 'INVRPT', fichier, 'OK', `Photo du stock (${lignes.length} lignes)`, lignes.length);
  return fichier;
}

/* ---------- Fichiers d'exemple (modèles pour l'ERP) ---------- */
function ecrireExemples() {
  const commandes = path.join(REPERTOIRES.exemples, 'commandes_exemple.csv');
  if (!fs.existsSync(commandes)) {
    fs.writeFileSync(commandes,
      '﻿numeroExterne;client;dateLivraison;transporteur;priorite;article;qte\n' +
      'WEB-100234;CLI-002;' + new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) + ';TRP-COLIS;3;TEX-001;10\n' +
      'WEB-100234;CLI-002;;;;TEX-005;5\n' +
      'WEB-100234;CLI-002;;;;MAI-001;6\n' +
      'WEB-100235;CLI-007;' + new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + ';TRP-CHRONO;1;EPI-001;24\n' +
      'WEB-100235;CLI-007;;;;EPI-002;12\n', 'utf8');
  }
  const attendus = path.join(REPERTOIRES.exemples, 'attendus_exemple.csv');
  if (!fs.existsSync(attendus)) {
    fs.writeFileSync(attendus,
      '﻿numeroExterne;fournisseur;datePrevue;article;qtePrevue\n' +
      'PO-88101;FRN-001;' + new Date(Date.now() + 86400000).toISOString().slice(0, 10) + ';TEX-001;100\n' +
      'PO-88101;FRN-001;;TEX-002;80\n' +
      'PO-88101;FRN-001;;TEX-010;40\n', 'utf8');
  }
}

function journal() {
  return [...store.getDb().echangesEdi].reverse().slice(0, 200);
}

module.exports = {
  initialiser, scannerEntrant, exporterDesadv, exporterRecadv, exporterInvrpt,
  journal, REPERTOIRES,
};
