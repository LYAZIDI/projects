'use strict';
const mod = require('../backend/dist/app');
const app = mod.default || mod;
module.exports = app;
