import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const GRADLE_PROPERTIES = join(homedir(), '.gradle', 'gradle.properties');
export const SIGNING_DIR = join(homedir(), '.caster-companion');
export const KEYSTORE_PATH = join(SIGNING_DIR, 'release.keystore');
export const KEY_ALIAS = 'caster-companion';

export function hasReleaseSigning(): boolean {
  return (
    existsSync(GRADLE_PROPERTIES) &&
    /^CASTER_UPLOAD_STORE_FILE=/m.test(readFileSync(GRADLE_PROPERTIES, 'utf8'))
  );
}
