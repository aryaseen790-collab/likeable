// Signs Android release builds with the project's own upload key instead of the
// public debug key that the default template uses.
//
// The key is never in the repository. The build reads it from environment variables
// (set from encrypted GitHub secrets in .github/workflows/android-apk.yml):
//   LPT_KEYSTORE_FILE      absolute path to the .jks file
//   LPT_KEYSTORE_PASSWORD  keystore password
//   LPT_KEY_ALIAS          key alias
//   LPT_KEY_PASSWORD       key password
// If they are missing, the release build is left unsigned (it never falls back to
// the debug key), so a misconfigured build can't be installed by accident.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// lpt-release-signing';
const CONFIG = `
        ${MARK}
        release {
            def ks = System.getenv('LPT_KEYSTORE_FILE')
            if (ks) {
                storeFile file(ks)
                storePassword System.getenv('LPT_KEYSTORE_PASSWORD')
                keyAlias System.getenv('LPT_KEY_ALIAS')
                keyPassword System.getenv('LPT_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(MARK)) return cfg;
    // 1. Add a release signing config next to the debug one.
    g = g.replace(/(signingConfigs\s*\{\s*\n\s*debug\s*\{[\s\S]*?\n\s*\})/, `$1${CONFIG}`);
    // 2. Use it for the release build type (inside buildTypes, not signingConfigs),
    //    only when the key is configured.
    const types = g.indexOf('buildTypes {');
    const rel = types < 0 ? -1 : g.indexOf('release {', types);
    const line = rel < 0 ? -1 : g.indexOf('signingConfig signingConfigs.debug', rel);
    const end = rel < 0 ? -1 : g.indexOf('\n        }', rel);
    if (line < 0 || line > end) throw new Error('withReleaseSigning: release build type not found; update the plugin');
    g = g.slice(0, line) + "signingConfig System.getenv('LPT_KEYSTORE_FILE') ? signingConfigs.release : null" + g.slice(line + 'signingConfig signingConfigs.debug'.length);
    if (!g.includes(MARK)) {
      throw new Error('withReleaseSigning: build.gradle layout changed; update the plugin');
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
