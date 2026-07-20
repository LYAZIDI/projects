#!/usr/bin/env node
/**
 * Patches appliqués après npm install pour compatibilité EAS Build :
 *
 * 1. expo-modules-core : fix AGP 8.x — components.release → components.findByName('release')
 * 2. compileSdkVersion AGP 8.x (expo-print, expo-sharing, etc.)
 *
 * Note : le patch expo-sqlite (stub CJS Node.js 24) a été supprimé car expo-sqlite@16
 * utilise un exports map explicite — le suffix .native.js n'est pas pris en compte.
 */
const fs = require('fs')
const path = require('path')

// ─── Patch 1 : expo-modules-core AGP 8.x ─────────────────────────────────────

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

// ─── Patch 3 : compileSdkVersion AGP 8.x (expo-print, expo-sharing, etc.) ────
// Certains modules Expo SDK 51 mettent compileSdkVersion dans un bloc
// conditionnel ignoré par AGP 8.x. On le déplace au niveau supérieur.

const OLD_COMPILE_BLOCK = `android {
  // Remove this if and it's contents, when support for SDK49 is dropped
  if (!safeExtGet("expoProvidesDefaultConfig", false)) {
    compileSdkVersion safeExtGet("compileSdkVersion", 34)

    defaultConfig {`

const NEW_COMPILE_BLOCK = `android {
  compileSdkVersion safeExtGet("compileSdkVersion", 34)
  // Remove this if and it's contents, when support for SDK49 is dropped
  if (!safeExtGet("expoProvidesDefaultConfig", false)) {
    defaultConfig {`

const modulesToPatch = ['expo-print', 'expo-sharing']

for (const mod of modulesToPatch) {
  const gradlePath = path.join(__dirname, '..', 'node_modules', mod, 'android', 'build.gradle')

  if (!fs.existsSync(gradlePath)) {
    console.log(`[patch] ${mod}/android/build.gradle non trouvé, patch ignoré.`)
    continue
  }

  let content = fs.readFileSync(gradlePath, 'utf8')

  if (content.includes(NEW_COMPILE_BLOCK)) {
    console.log(`[patch] ${mod}: déjà patché.`)
    continue
  }

  if (content.includes(OLD_COMPILE_BLOCK)) {
    content = content.replace(OLD_COMPILE_BLOCK, NEW_COMPILE_BLOCK)
    fs.writeFileSync(gradlePath, content, 'utf8')
    console.log(`[patch] ${mod}: compileSdkVersion déplacé hors du bloc conditionnel`)
  } else {
    console.log(`[patch] ${mod}: structure inattendue, patch non appliqué.`)
  }
}
