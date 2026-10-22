'use strict';
/* ============================================================
 *  Client API vers les deux autres applications de la suite :
 *  LM-WMS (référentiels, stock, commandes) et LM-TMS (simulation
 *  de coût, expéditions). Clé d'intégration partagée.
 * ============================================================ */

const config = require('../config.json');

async function appel(base, chemin, options = {}) {
  const reponse = await fetch(base + chemin, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.cleIntegration,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(`${base}${chemin} : ${donnees.erreur || 'HTTP ' + reponse.status}`);
  return donnees;
}

const wms = chemin => appel(config.wmsUrl, chemin);
const tms = chemin => appel(config.tmsUrl, chemin);

async function etatLiaison(base) {
  try { await appel(base, '/api/moi'); return { joignable: true, url: base }; }
  catch (e) { return { joignable: false, url: base, erreur: e.message }; }
}

/* Authentification déléguée au WMS (comptes uniques de la suite) */
async function authentifier(code, mdp) {
  const reponse = await fetch(config.wmsUrl + '/api/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, mdp }),
    signal: AbortSignal.timeout(5000),
  });
  if (!reponse.ok) return null;
  return reponse.json();
}

/* ---------- Lectures WMS ---------- */
const listerTiers = () => wms('/api/tiers');
const listerArticles = () => wms('/api/articles');
const listerStock = () => wms('/api/stock');
const listerCommandesWms = () => wms('/api/commandes');

/* Quantités réellement disponibles par article (stock DISPO - réservé) */
async function disponibilites() {
  const stock = await listerStock();
  const disponibles = {};
  for (const s of stock) {
    if (s.statut !== 'DISPO') continue;
    disponibles[s.article] = (disponibles[s.article] || 0) + s.qte - (s.qteReservee || 0);
  }
  return disponibles;
}

/* ---------- Écriture WMS : transmission d'une commande ---------- */
function transmettreCommandeWms(corps) {
  return appel(config.wmsUrl, '/api/commandes', { method: 'POST', body: JSON.stringify(corps) });
}

/* ---------- TMS ---------- */
function simulerTransport(poids) {
  return appel(config.tmsUrl, '/api/simuler', { method: 'POST', body: JSON.stringify({ poids }) });
}
const listerExpeditionsTms = () => tms('/api/expeditions');

module.exports = {
  config, etatLiaison, authentifier,
  listerTiers, listerArticles, listerStock, listerCommandesWms, disponibilites,
  transmettreCommandeWms, simulerTransport, listerExpeditionsTms,
};
