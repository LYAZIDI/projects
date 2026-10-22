'use strict';
/* ============================================================
 *  Intégration WMS -> TMS :
 *   - synchronisation de la liste des transporteurs
 *   - import de rattrapage des chargements expédiés (si le TMS
 *     était éteint au moment du webhook)
 * ============================================================ */

const store = require('./store');
const tms = require('./tms');
const wms = require('./wms-client');

/* Récupère les transporteurs du WMS et les upsert localement */
async function synchroniserTransporteurs() {
  const distants = await wms.listerTransporteurs();
  let crees = 0;
  for (const t of distants) {
    if (tms.transporteurUpsert(t.code, t.nom).cree) crees++;
  }
  return { total: distants.length, nouveaux: crees };
}

/* Construit le poids d'un chargement à partir des colis + articles WMS */
function poidsChargement(chargement, colisParSscc, articlesParCode) {
  let poids = 0;
  for (const sscc of chargement.colis) {
    const colis = colisParSscc.get(sscc);
    if (!colis) continue;
    for (const ligne of colis.lignes) {
      const article = articlesParCode.get(ligne.article);
      poids += (article ? article.poidsUnitaire : 0) * ligne.qte;
    }
  }
  return Math.round(Math.max(0.1, poids) * 100) / 100;
}

/* Importe les chargements EXPEDIE du WMS qui n'ont pas encore
 * d'expédition TMS (rattrapage après indisponibilité). */
async function importerChargements() {
  const [chargements, colis, articles, commandes] = await Promise.all([
    wms.listerChargements(), wms.listerColis(), wms.listerArticles(), wms.listerCommandes(),
  ]);
  const colisParSscc = new Map(colis.map(c => [c.sscc, c]));
  const articlesParCode = new Map(articles.map(a => [a.code, a]));
  const commandesParId = new Map(commandes.map(c => [c.id, c.numero]));
  const dejaConnues = new Set(store.getDb().expeditions.map(e => e.chargementNumero));

  const importees = [];
  for (const chargement of chargements) {
    if (chargement.statut !== 'EXPEDIE' || dejaConnues.has(chargement.numero)) continue;
    const numerosCommandes = [...new Set(chargement.colis
      .map(sscc => commandesParId.get((colisParSscc.get(sscc) || {}).commande))
      .filter(Boolean))];
    importees.push(tms.expeditionEnregistrer({
      chargement: chargement.numero,
      transporteur: chargement.transporteur,
      dateDepart: chargement.dateDepart,
      nbColis: chargement.colis.length,
      poids: poidsChargement(chargement, colisParSscc, articlesParCode),
      commandes: numerosCommandes,
    }));
  }
  return { importees: importees.length, dejaConnues: dejaConnues.size, expeditions: importees };
}

module.exports = { synchroniserTransporteurs, importerChargements, poidsChargement };
