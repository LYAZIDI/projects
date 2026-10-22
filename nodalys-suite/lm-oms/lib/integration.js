'use strict';
/* ============================================================
 *  Orchestration OMS <-> (WMS + TMS) : c'est ici que le métier
 *  pur de oms.js rencontre les données réelles des deux autres
 *  applications.
 * ============================================================ */

const store = require('./store');
const oms = require('./oms');
const suite = require('./suite-client');
const analyse = require('./analyse');
const typesafe = require('./typesafe');

/* Synchronise les clients (tiers CLIENT du WMS) */
async function synchroniserClients() {
  const tiers = await suite.listerTiers();
  let nouveaux = 0;
  for (const t of tiers.filter(x => x.type === 'CLIENT')) {
    if (oms.clientUpsert(t).cree) nouveaux++;
  }
  return { total: tiers.filter(x => x.type === 'CLIENT').length, nouveaux };
}

/* Validation avec les données réelles : stock WMS + simulation TMS */
async function validerCommande(commandeId) {
  const db = store.getDb();
  const commande = db.commandes.find(c => c.id === Number(commandeId));
  if (!commande) { const e = new Error('Commande inconnue'); e.metier = true; throw e; }

  const [articles, disponibles] = await Promise.all([
    suite.listerArticles(), suite.disponibilites(),
  ]);

  /* poids nécessaire à la simulation : calcul préalable rapide */
  const articlesParCode = new Map(articles.map(a => [a.code, a]));
  const poids = Math.max(0.1, commande.lignes.reduce((somme, l) =>
    somme + ((articlesParCode.get(l.article) || {}).poidsUnitaire || 0) * l.qte, 0));

  let simulation = null;
  try { simulation = await suite.simulerTransport(poids); }
  catch { /* TMS injoignable : le métier le signale dans le motif */ }

  return oms.commandeValider(commandeId, { articles, disponibles, simulation });
}

/* Pré-remplissage d'une commande depuis un texte libre (Jev) : propose,
 * ne crée rien — voir lib/analyse.js */
async function analyserCommande(texte) {
  if (!String(texte || '').trim()) { const e = new Error('Texte de commande vide'); e.metier = true; throw e; }
  const articles = await suite.listerArticles();
  const { state, questions, candidats } = analyse.construireRequete(texte, store.getDb().clients, articles);
  const reponses = await typesafe.systemOne(state, questions);
  return analyse.interpreter(reponses, candidats);
}

/* Transmission réelle au WMS */
async function transmettreCommande(commandeId) {
  const db = store.getDb();
  const commande = db.commandes.find(c => c.id === Number(commandeId));
  if (!commande) { const e = new Error('Commande inconnue'); e.metier = true; throw e; }
  if (commande.statut !== 'VALIDEE') {
    const e = new Error(`Commande ${commande.numero} non validée (${commande.statut})`);
    e.metier = true; throw e;
  }
  let creee;
  try {
    creee = await suite.transmettreCommandeWms({
      referenceExterne: commande.numero,
      client: commande.client,
      priorite: commande.priorite,
      dateLivraison: commande.dateLivraisonSouhaitee,
      transporteur: commande.transporteurChoisi,
      lignes: commande.lignes.map(l => ({ article: l.article, qte: l.qte })),
    });
  } catch (e) {
    /* Déjà reçue par le WMS (requête rejouée, ou écriture OMS perdue
     * après l'envoi) : on reprend la commande WMS existante. */
    if (!/déjà importée/.test(e.message)) throw e;
    creee = (await suite.listerCommandesWms()).find(c => c.referenceExterne === commande.numero);
    if (!creee) throw e;
  }
  return oms.commandeMarquerTransmise(commandeId, creee.numero);
}

/* Rafraîchit les statuts depuis le WMS et le TMS */
async function rafraichirSuivi() {
  const commandesWms = await suite.listerCommandesWms();
  let expeditionsTms = [];
  try { expeditionsTms = await suite.listerExpeditionsTms(); }
  catch { /* TMS injoignable : le suivi WMS suffit pour cette passe */ }
  return oms.suiviRafraichir({ commandesWms, expeditionsTms });
}

/* Détail 360° d'une commande (live) */
async function suivi360(commandeId) {
  const db = store.getDb();
  const commande = db.commandes.find(c => c.id === Number(commandeId));
  if (!commande) { const e = new Error('Commande inconnue'); e.metier = true; throw e; }
  const resultat = { oms: commande, wms: null, tms: null };
  if (commande.wmsNumero) {
    try {
      const commandesWms = await suite.listerCommandesWms();
      resultat.wms = commandesWms.find(c => c.numero === commande.wmsNumero) || null;
    } catch { /* WMS injoignable */ }
    try {
      const expeditions = await suite.listerExpeditionsTms();
      resultat.tms = expeditions.find(e => (e.commandes || []).includes(commande.wmsNumero)) || null;
    } catch { /* TMS injoignable */ }
  }
  return resultat;
}

module.exports = { synchroniserClients, validerCommande, transmettreCommande, rafraichirSuivi, suivi360, analyserCommande };
