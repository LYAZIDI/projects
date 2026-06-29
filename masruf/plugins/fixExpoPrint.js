const { withProjectBuildGradle } = require('@expo/config-plugins')

// expo-print@12.8.x ne définit pas compileSdkVersion quand expoProvidesDefaultConfig=true.
// On injecte un bloc subprojects dans android/build.gradle pour forcer compileSdkVersion=34
// sur tous les modules android library qui ne l'ont pas défini.
module.exports = function fixExpoPrint(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config

    const fix = `
// Fix: force compileSdkVersion on subprojects missing it (expo-print AGP 8.x bug)
subprojects {
    afterEvaluate {
        if (it.plugins.hasPlugin('com.android.library')) {
            if (!it.android.compileSdkVersion) {
                it.android.compileSdkVersion = 34
            }
        }
    }
}
`
    if (!config.modResults.contents.includes('// Fix: force compileSdkVersion')) {
      config.modResults.contents += fix
    }

    return config
  })
}
