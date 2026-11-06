# caster-companion
Unofficial Metazoo Companion App

An unofficial, fan-made companion app for the MetaZoo TCG (2025). Not affiliated with MetaZoo. Feature spec: [`design-doc.md`](design-doc.md). Decisions: [`docs/decisions.md`](docs/decisions.md).

## Install on your phone

Open the [Releases page](https://github.com/druerridge/caster-companion/releases) on your Android phone, download the latest `caster-companion-vX.Y.Z.apk`, and open it. You'll need to allow installs from your browser the first time. Each new release installs over the previous one.

## Dev setup (Windows)

Prereqs:
- Node 22.18+ (runs the `.ts` scripts natively)
- JDK 17. Set `JAVA_HOME`, e.g. `%LOCALAPPDATA%\Programs\jdk-17.x`.
- Android SDK command-line tools. Set `ANDROID_HOME`, e.g. `%LOCALAPPDATA%\Android\Sdk`. Gradle downloads the platform and build-tools it needs on first build.
- CMake 3.31.6 (`sdkmanager "cmake;3.31.6"`) and Windows long paths enabled. To enable long paths, run this in an admin PowerShell: `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force`. See decision D9.
- GitHub CLI, logged in (`gh auth login`), for publishing releases.

```sh
npm install
npm run setup-signing   # one-time: creates ~/.caster-companion/release.keystore (BACK IT UP)
```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server. Scan the QR code with Expo Go on your phone (same Wi-Fi) for hot reload. |
| `npm run check` | Lint + typecheck + tests (target < 60 s). CI runs this too. |
| `npm test` | Jest tests only |
| `npm run apk` | Build a signed release APK into `dist/` (`-- --clean` regenerates `android/`) |
| `npm run release` | From a clean `main`: run checks, bump patch version, build APK, tag, push, create a GitHub Release with the APK. Use `-- minor`/`-- major` for bigger bumps, or `-- --no-bump`. |

## Layout

- `src/app/`: screens (Expo Router; every file is a route)
- `src/components/`: shared UI (e.g. `CardFrame`)
- `src/theme/`: design tokens
- `src/domain/`: pure game logic, unit-tested without React
- `plugins/`: Expo config plugins (release signing)
- `scripts/`: build/release tooling
- `__tests__/`: Jest tests
