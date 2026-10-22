'use strict';
/* Configuration : config.json en local, variables d'environnement en
 * ligne, qui priment si définies :
 *   LM_WMS_URL, LM_TMS_URL, LM_OMS_URL           adresses des apps
 *   LM_WMS_URL_PUBLIC, LM_TMS_URL_PUBLIC, …      liens affichés, si
 *                                                différents (sinon = adresse)
 * Une adresse fournie par variable remplace aussi le lien public de
 * config.json (anciens tunnels de démo). */
const fichier = require('../config.json');

function adresses(app) {
  const interne = process.env[`LM_${app}_URL`];
  const publique = process.env[`LM_${app}_URL_PUBLIC`];
  const cle = app.toLowerCase();
  return {
    [`${cle}Url`]: interne || fichier[`${cle}Url`],
    [`${cle}UrlPublic`]: publique || interne || fichier[`${cle}UrlPublic`],
  };
}

module.exports = { ...fichier, ...adresses('WMS'), ...adresses('TMS'), ...adresses('OMS') };
