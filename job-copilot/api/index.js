'use strict';
// CommonJS wrapper — avoids "type":"module" ESM-native loading
// Vercel bundles this with ncc and resolves backend/node_modules correctly
const mod = require('../backend/dist/app');
const app = mod.default || mod;
module.exports = app;
