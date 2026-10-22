'use strict';
/* ============================================================
 *  Client API vers le LM-WMS - toutes les lectures se font avec
 *  la clé d'intégration partagée (compte de service côté WMS).
 * ============================================================ */

const config = require('./config');

async function appelWms(chemin, options = {}) {
  const reponse = await fetch(config.wmsUrl + chemin, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.cleIntegration,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(`WMS ${chemin} : ${donnees.erreur || 'HTTP ' + reponse.status}`);
  }
  return donnees;
}

/* Le WMS est-il joignable ? */
async function etatWms() {
  try {
    await appelWms('/api/moi');
    return { joignable: true, url: config.wmsUrl };
  } catch (e) {
    return { joignable: false, url: config.wmsUrl, erreur: e.message };
  }
}

/* Authentification déléguée : le TMS ne stocke aucun mot de passe,
 * il valide les identifiants auprès du WMS (comptes uniques). */
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

const listerTransporteurs = () => appelWms('/api/transporteurs');
const listerChargements = () => appelWms('/api/chargements');
const listerColis = () => appelWms('/api/colis');
const listerArticles = () => appelWms('/api/articles');
const listerCommandes = () => appelWms('/api/commandes');

module.exports = {
  etatWms, authentifier,
  listerTransporteurs, listerChargements, listerColis, listerArticles, listerCommandes,
  config,
};
