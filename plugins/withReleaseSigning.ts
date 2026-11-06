import { withAppBuildGradle, type ConfigPlugin } from 'expo/config-plugins';

// Release signing for locally built APKs. Credentials come from Gradle
// properties (put them in ~/.gradle/gradle.properties, never in the repo):
//   CASTER_UPLOAD_STORE_FILE=C:/Users/me/.caster-companion/release.keystore
//   CASTER_UPLOAD_STORE_PASSWORD=...
//   CASTER_UPLOAD_KEY_ALIAS=caster-companion
//   CASTER_UPLOAD_KEY_PASSWORD=...
// Without them, release builds fall back to the debug key (fine for CI/dev).

const MARKER = '// caster-companion: release signing';

const RELEASE_SIGNING_CONFIG = `
        ${MARKER}
        release {
            if (project.hasProperty('CASTER_UPLOAD_STORE_FILE')) {
                storeFile file(CASTER_UPLOAD_STORE_FILE)
                storePassword CASTER_UPLOAD_STORE_PASSWORD
                keyAlias CASTER_UPLOAD_KEY_ALIAS
                keyPassword CASTER_UPLOAD_KEY_PASSWORD
            }
        }`;

const DEBUG_SIGNING_BLOCK = /(signingConfigs \{\s*debug \{[^}]*\})/;
const RELEASE_BUILD_TYPE_SIGNING =
  /(release \{(?:(?!buildTypes)[\s\S])*?)signingConfig signingConfigs\.debug/;

export function applyReleaseSigning(buildGradle: string): string {
  if (buildGradle.includes(MARKER)) return buildGradle;
  if (!DEBUG_SIGNING_BLOCK.test(buildGradle) || !RELEASE_BUILD_TYPE_SIGNING.test(buildGradle)) {
    throw new Error(
      'withReleaseSigning: android/app/build.gradle layout changed; update plugins/withReleaseSigning.ts',
    );
  }
  return buildGradle
    .replace(DEBUG_SIGNING_BLOCK, `$1${RELEASE_SIGNING_CONFIG}`)
    .replace(
      RELEASE_BUILD_TYPE_SIGNING,
      "$1signingConfig project.hasProperty('CASTER_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
}

const withReleaseSigning: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: expected a Groovy build.gradle');
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });

export default withReleaseSigning;
