#!/usr/bin/env node
/**
 * Patches appliqués après npm install pour compatibilité EAS Build :
 *
 * 1. expo-sqlite : stub CJS pour Node.js 24 (index.js → stub, index.native.js → réel)
 * 2. expo-modules-core : fix AGP 8.x — components.release → components.findByName('release')
 */
const fs = require('fs')
const path = require('path')

// ─── Patch 1 : expo-sqlite ────────────────────────────────────────────────────

const sqliteBuildDir = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'build')
const sqliteIndexPath = path.join(sqliteBuildDir, 'index.js')
const sqliteNativePath = path.join(sqliteBuildDir, 'index.native.js')

if (!fs.existsSync(sqliteBuildDir)) {
  console.log('[patch] expo-sqlite/build non trouvé, patch ignoré.')
} else {
  const originalContent = fs.readFileSync(sqliteIndexPath, 'utf8')
  if (!originalContent.includes('Stub CJS')) {
    fs.writeFileSync(sqliteNativePath, originalContent, 'utf8')
    console.log('[patch] expo-sqlite: index.native.js créé (implémentation réelle pour Metro)')
  }
  const stub = `'use strict';
// Stub CJS pour Node.js 24 — Metro utilise index.native.js
module.exports = {};
`
  fs.writeFileSync(sqliteIndexPath, stub, 'utf8')
  console.log('[patch] expo-sqlite: index.js remplacé par stub CJS')
}

// ─── Patch 2 : expo-modules-core AGP 8.x ─────────────────────────────────────

const gradlePluginPath = path.join(
  __dirname, '..', 'node_modules', 'expo-modules-core',
  'android', 'ExpoModulesCorePlugin.gradle'
)

if (!fs.existsSync(gradlePluginPath)) {
  console.log('[patch] ExpoModulesCorePlugin.gradle non trouvé, patch ignoré.')
} else {
  let content = fs.readFileSync(gradlePluginPath, 'utf8')

  if (content.includes('from components.release') && !content.includes('findByName')) {
    // Remplace le bloc publishing pour supporter AGP 8.x
    const oldBlock = `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }
}`

    const newBlock = `  project.afterEvaluate {
    def releaseComponent = components.findByName('release')
    if (releaseComponent != null) {
      publishing {
        publications {
          release(MavenPublication) {
            from releaseComponent
          }
        }
        repositories {
          maven {
            url = mavenLocal().url
          }
        }
      }
    }
  }
}`

    if (content.includes(oldBlock)) {
      content = content.replace(oldBlock, newBlock)
      fs.writeFileSync(gradlePluginPath, content, 'utf8')
      console.log('[patch] expo-modules-core: ExpoModulesCorePlugin.gradle patché pour AGP 8.x')
    } else {
      // Fallback : remplacement simple de la ligne
      content = content.replace(
        'from components.release',
        "from components.findByName('release')"
      )
      fs.writeFileSync(gradlePluginPath, content, 'utf8')
      console.log('[patch] expo-modules-core: components.release → components.findByName (fallback)')
    }
  } else {
    console.log('[patch] expo-modules-core: déjà patché ou non nécessaire.')
  }
}
