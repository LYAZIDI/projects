#!/usr/bin/env node
/**
 * Patch expo-sqlite pour compatibilité Node.js 24
 * - index.native.js → implémentation réelle (utilisée par Metro sur iOS/Android)
 * - index.js → stub CJS vide (utilisé par Node.js durant expo start)
 */
const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'build')
const indexPath = path.join(buildDir, 'index.js')
const nativePath = path.join(buildDir, 'index.native.js')

if (!fs.existsSync(buildDir)) {
  console.log('[patch-expo-sqlite] expo-sqlite/build non trouvé, patch ignoré.')
  process.exit(0)
}

// 1. Sauvegarder l'original comme .native.js si pas encore fait
const originalContent = fs.readFileSync(indexPath, 'utf8')
if (!originalContent.includes('Stub CJS')) {
  fs.writeFileSync(nativePath, originalContent, 'utf8')
  console.log('[patch-expo-sqlite] index.native.js créé (implémentation réelle pour Metro)')
}

// 2. Remplacer index.js par stub CJS
const stub = `'use strict';
// Stub CJS pour Node.js 24 — Metro utilise index.native.js
module.exports = {};
`
fs.writeFileSync(indexPath, stub, 'utf8')
console.log('[patch-expo-sqlite] index.js remplacé par stub CJS (Node.js 24 compatible)')
