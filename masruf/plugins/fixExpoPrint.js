const { withProjectBuildGradle } = require('@expo/config-plugins')

// expo-print@12.8.x ne définit pas compileSdkVersion quand expoProvidesDefaultConfig=true.
// afterEvaluate est trop tardif — AGP valide compileSdkVersion pendant l'évaluation.
// plugins.withId se déclenche dès que 'com.android.library' est appliqué, avant que
// le reste du build.gradle ne soit évalué. On force compileSdkVersion=34 à ce moment.
module.exports = function fixExpoPrint(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config

    const marker = '// Fix(expo-print): force compileSdkVersion via plugins.withId'
    if (config.modResults.contents.includes(marker)) return config

    const fix = `
${marker}
subprojects { subproj ->
    subproj.plugins.withId('com.android.library') {
        subproj.android {
            compileSdkVersion 34
        }
    }
}
`
    config.modResults.contents += fix
    return config
  })
}
