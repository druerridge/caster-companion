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

## Rules Lookup Worker (feature 7, D23)

"Ask a Ruling" sends questions to a Cloudflare Worker (`worker/`) that calls Gemini with a free AI Studio key. The key lives only in Cloudflare.

One-time setup:
1. In [Google AI Studio](https://aistudio.google.com/apikey), create an API key in a project with **no billing account** linked. Abuse can then only use up the free quota, never cost money.
2. Create a free Cloudflare account, then run `npx wrangler login`.
3. Put the rulebook PDFs (`metazoo-full-base-set-rules.pdf`, `metazoo-quick-play-demo-rules.pdf`) in `OfflineDocumentRulesReferences/`. The folder is gitignored. You need `pdftotext`, which ships with Git for Windows.
4. Run `npm run worker:secret` and paste the key.
5. Card text (D29): run `npx wrangler kv namespace create CARDS --config worker/wrangler.toml`, paste the printed id into `worker/wrangler.toml` (replacing `REPLACE_WITH_CARDS_NAMESPACE_ID`), then run `npm run cards:seed -- --remote`. The first crawl takes about 12 minutes; after that a 15-minute Cron adds new cards on its own.
6. Run `npm run worker:deploy`. Put the printed `https://caster-companion-rules.<you>.workers.dev` URL, followed by `/ask`, in `RULES_ASK_URL` in `src/features/rules/askConfig.ts`.

| Command | What it does |
|---|---|
| `npm run grounding` | Rebuild the reference text (errata page, rules web pages, rulebook PDFs, dev rulings from `OfflineDocumentRulesReferences/dev-rulings.json`) |
| `npm run cards:seed` | Crawl new card pages and rebuild the card index; add `-- --local` or `-- --remote` to upload it to the CARDS store |
| `npm run worker:dev` | Run the Worker locally on :8787 (put `GEMINI_API_KEY=...` in `worker/.dev.vars`) |
| `npm run worker:deploy` | Rebuild the reference text and deploy |
| `npm run worker:tail` | Stream live Worker logs |

To switch in-app answers off, set `KILL_SWITCH = "on"` in `worker/wrangler.toml` and redeploy. The app then offers to ask ChatGPT or Claude instead. Re-run `worker:deploy` whenever the errata page changes.

## Layout

- `src/app/`: screens (Expo Router; every file is a route)
- `src/components/`: shared UI (e.g. `CardFrame`)
- `src/theme/`: design tokens
- `src/domain/`: pure game logic, unit-tested without React
- `worker/`: Cloudflare Worker that proxies Rules Lookup questions to Gemini (D23)
- `plugins/`: Expo config plugins (release signing)
- `scripts/`: build/release tooling
- `__tests__/`: Jest tests
