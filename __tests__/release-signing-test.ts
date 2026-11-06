import { readFileSync } from 'fs';
import { join } from 'path';

import { applyReleaseSigning } from '../plugins/withReleaseSigning';

// Fixture is the unmodified android/app/build.gradle from `expo prebuild` (SDK 58).
const original = readFileSync(join(__dirname, 'fixtures/expo58-app-build.gradle'), 'utf8');

describe('withReleaseSigning', () => {
  const patched = applyReleaseSigning(original);

  it('adds a release signing config fed by Gradle properties', () => {
    expect(patched).toMatch(
      /release \{\s*if \(project\.hasProperty\('CASTER_UPLOAD_STORE_FILE'\)\)/,
    );
    expect(patched).toContain('storeFile file(CASTER_UPLOAD_STORE_FILE)');
  });

  it('signs release builds with the release key when configured, debug key otherwise', () => {
    expect(patched).toContain(
      "signingConfig project.hasProperty('CASTER_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    // debug build type keeps the debug key
    expect(patched).toMatch(/debug \{\s*signingConfig signingConfigs\.debug\s*\}/);
  });

  it('is idempotent', () => {
    expect(applyReleaseSigning(patched)).toBe(patched);
  });

  it('fails loudly if the generated layout changes', () => {
    expect(() => applyReleaseSigning('android { }')).toThrow(/layout changed/);
  });
});
