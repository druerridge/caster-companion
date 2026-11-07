import type { ExpoConfig } from 'expo/config';

import pkg from './package.json';
import { colors } from './src/theme/tokens.ts';
import { versionCodeFor } from './scripts/version.ts';

// package.json "version" is the single source of truth; the Android
// versionCode is derived from it so every release installs over the last.
const config: ExpoConfig = {
  name: 'Caster Companion',
  slug: 'caster-companion',
  version: pkg.version,
  scheme: 'castercompanion',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: colors.background,
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.druerridge.castercompanion',
    supportsTablet: true,
  },
  android: {
    package: 'com.druerridge.castercompanion',
    versionCode: versionCodeFor(pkg.version),
    adaptiveIcon: {
      backgroundColor: colors.background,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    // Display face embedded at build time, so it works offline (D14).
    [
      'expo-font',
      {
        android: {
          fonts: [
            {
              fontFamily: 'Lilita One',
              fontDefinitions: [{ path: './assets/fonts/LilitaOne-Regular.ttf', weight: 400 }],
            },
          ],
        },
        ios: { fonts: ['./assets/fonts/LilitaOne-Regular.ttf'] },
      },
    ],
    './plugins/withReleaseSigning.ts',
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
