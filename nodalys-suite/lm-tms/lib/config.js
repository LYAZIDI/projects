'use strict';
/* Configuration : config.json en local, variables d'environnement en
 * ligne (LM_WMS_URL, LM_CLE_INTEGRATION), qui priment si définies. */
const fichier = require('../config.json');

module.exports = {
  ...fichier,
  wmsUrl: process.env.LM_WMS_URL || fichier.wmsUrl,
  cleIntegration: process.env.LM_CLE_INTEGRATION || fichier.cleIntegration,
};
