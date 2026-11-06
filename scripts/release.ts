// Bump version, build the APK, tag, push and publish a GitHub Release.
//   npm run release               -> patch bump (0.1.0 -> 0.1.1)
//   npm run release -- minor      -> minor bump
//   npm run release -- --no-bump  -> release the current version as-is
import { readFileSync, writeFileSync } from 'node:fs';

import { buildApk } from './build-apk.ts';
import { capture, run } from './exec.ts';
import { bumpVersion, type Bump } from './version.ts';

const args = process.argv.slice(2);
const bump: Bump = (['major', 'minor', 'patch'] as const).find((b) => args.includes(b)) ?? 'patch';
const noBump = args.includes('--no-bump');

if (capture('git', ['status', '--porcelain']) !== '') {
  throw new Error('Working tree is not clean; commit or stash first.');
}
const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main') throw new Error(`Releases are cut from main (currently on "${branch}").`);
capture('gh', ['auth', 'status']);

run('npm', ['run', 'check']);

interface VersionedJson {
  version: string;
  packages?: Record<string, { version?: string }>;
}

function setVersion(file: string, next: string): void {
  const json = JSON.parse(readFileSync(file, 'utf8')) as VersionedJson;
  json.version = next;
  const rootPackage = json.packages?.[''];
  if (rootPackage) rootPackage.version = next;
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

const current = (JSON.parse(readFileSync('package.json', 'utf8')) as VersionedJson).version;
const version = noBump ? current : bumpVersion(current, bump);
if (!noBump) {
  setVersion('package.json', version);
  setVersion('package-lock.json', version);
}

const apk = buildApk({ clean: false });
const tag = `v${version}`;

if (!noBump) run('git', ['commit', '-am', `Release ${tag}`]);
run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
run('git', ['push', '--follow-tags']);
run('gh', [
  'release',
  'create',
  tag,
  apk,
  '--title',
  `Caster Companion ${tag}`,
  '--generate-notes',
]);
console.log(`\nPublished ${tag}. Open the release page on your phone to download the APK.`);
