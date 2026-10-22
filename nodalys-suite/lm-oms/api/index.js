'use strict';
/* Point d'entrée Vercel : toutes les routes /api/* arrivent ici
 * (voir vercel.json), le front statique est servi depuis public/. */
module.exports = require('../server').gestionnaire;
