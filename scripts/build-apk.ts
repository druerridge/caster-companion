// Build a signed release APK locally: npm run apk [-- --clean]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { run } from './exec.ts';
import { hasReleaseSigning } from './signing.ts';

// Native deps (reanimated, gesture-handler) produce object-file paths ~300
// chars long. The SDK's default CMake 3.22 ships ninja 1.10, which can't use
// Windows long paths; CMake 3.31's ninja 1.12 can (requires the Windows
// LongPathsEnabled registry setting). See docs/decisions.md D9.
export const CMAKE_VERSION = '3.31.6';

function pinCmake(androidDir: string, androidHome: string): void {
  const cmakeDir = join(androidHome, 'cmake', CMAKE_VERSION);
  if (!existsSync(cmakeDir)) {
    throw new Error(
      `CMake ${CMAKE_VERSION} not installed. Run: sdkmanager "cmake;${CMAKE_VERSION}"`,
    );
  }
  const toGradlePath = (p: string) => p.replaceAll('\\', '/');
  writeFileSync(
    join(androidDir, 'local.properties'),
    `sdk.dir=${toGradlePath(androidHome)}\ncmake.dir=${toGradlePath(cmakeDir)}\n`,
  );
}

export function buildApk(options: { clean: boolean }): string {
  const { JAVA_HOME, ANDROID_HOME } = process.env;
  if (!JAVA_HOME || !ANDROID_HOME) {
    throw new Error('JAVA_HOME and ANDROID_HOME must be set (see README "Dev setup").');
  }
  if (!hasReleaseSigning()) {
    throw new Error('Release signing not configured. Run: npm run setup-signing');
  }

  const root = process.cwd();
  const android = join(root, 'android');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version: string;
  };

  const prebuildArgs = ['expo', 'prebuild', '--platform', 'android', '--no-install'];
  run('npx', options.clean ? [...prebuildArgs, '--clean'] : prebuildArgs);
  pinCmake(android, ANDROID_HOME);

  const gradlew = join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  // arm64 only: covers essentially every modern Android phone; halves build time and APK size.
  run(gradlew, ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a'], { cwd: android });

  mkdirSync(join(root, 'dist'), { recursive: true });
  const out = join(root, 'dist', `caster-companion-v${version}.apk`);
  copyFileSync(join(android, 'app/build/outputs/apk/release/app-release.apk'), out);
  console.log(`\nAPK ready: ${out}`);
  return out;
}

if (import.meta.filename === process.argv[1]) {
  buildApk({ clean: process.argv.includes('--clean') });
}
