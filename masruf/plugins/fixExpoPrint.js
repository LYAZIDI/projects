const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

module.exports = function fixExpoPrint(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const expoPrintGradle = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-print',
        'android',
        'build.gradle'
      )

      if (!fs.existsSync(expoPrintGradle)) {
        console.log('[fixExpoPrint] build.gradle non trouvé, patch ignoré.')
        return config
      }

      let content = fs.readFileSync(expoPrintGradle, 'utf8')

      if (content.includes('// PATCHED: compileSdkVersion')) {
        console.log('[fixExpoPrint] déjà patché.')
        return config
      }

      // expo-print@12.8.x oublie d'appeler useDefaultAndroidSdkVersions() quand
      // expoProvidesDefaultConfig=true, donc compileSdkVersion n'est jamais défini.
      // On l'injecte directement avant le namespace pour corriger le build AGP 8.x.
      if (!content.includes('namespace "expo.modules.print"')) {
        console.log('[fixExpoPrint] namespace non trouvé, patch ignoré.')
        return config
      }

      content = content.replace(
        'namespace "expo.modules.print"',
        '// PATCHED: compileSdkVersion\n  compileSdkVersion safeExtGet("compileSdkVersion", 34)\n  namespace "expo.modules.print"'
      )
      fs.writeFileSync(expoPrintGradle, content, 'utf8')
      console.log('[fixExpoPrint] compileSdkVersion 34 injecté dans expo-print/android/build.gradle')

      return config
    }
  ])
}
