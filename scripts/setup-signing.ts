// One-time: create a release keystore outside the repo and register it in
// ~/.gradle/gradle.properties. BACK UP the keystore and properties: without
// them, future APKs can't install over existing ones (you'd have to uninstall).
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { run } from './exec.ts';
import {
  GRADLE_PROPERTIES,
  KEY_ALIAS,
  KEYSTORE_PATH,
  SIGNING_DIR,
  hasReleaseSigning,
} from './signing.ts';

if (hasReleaseSigning()) {
  console.log(`Release signing already configured in ${GRADLE_PROPERTIES}`);
  process.exit(0);
}
if (existsSync(KEYSTORE_PATH)) {
  throw new Error(`${KEYSTORE_PATH} exists but is not registered in ${GRADLE_PROPERTIES}.`);
}

const javaHome = process.env.JAVA_HOME;
const keytool = javaHome ? join(javaHome, 'bin', 'keytool') : 'keytool';
const password = randomBytes(18).toString('hex');

mkdirSync(SIGNING_DIR, { recursive: true });
run(
  keytool,
  [
    '-genkeypair',
    '-noprompt',
    '-keystore',
    KEYSTORE_PATH,
    '-alias',
    KEY_ALIAS,
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-storepass',
    password,
    '-keypass',
    password,
    '-dname',
    'CN=Caster Companion',
  ],
  { secretArgs: true },
);

mkdirSync(dirname(GRADLE_PROPERTIES), { recursive: true });
appendFileSync(
  GRADLE_PROPERTIES,
  [
    '',
    '# Caster Companion release signing (see scripts/setup-signing.ts)',
    `CASTER_UPLOAD_STORE_FILE=${KEYSTORE_PATH.replaceAll('\\', '/')}`,
    `CASTER_UPLOAD_STORE_PASSWORD=${password}`,
    `CASTER_UPLOAD_KEY_ALIAS=${KEY_ALIAS}`,
    `CASTER_UPLOAD_KEY_PASSWORD=${password}`,
    '',
  ].join('\n'),
);

console.log(`\nCreated ${KEYSTORE_PATH}`);
console.log(`Registered it in ${GRADLE_PROPERTIES}`);
console.log('Back up BOTH files somewhere safe (e.g. a password manager).');
