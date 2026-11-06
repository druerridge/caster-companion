import { bumpVersion, versionCodeFor } from '../scripts/version';

describe('versioning', () => {
  it('derives a monotonic Android versionCode', () => {
    expect(versionCodeFor('0.1.0')).toBe(100);
    expect(versionCodeFor('1.2.3')).toBe(10203);
    expect(versionCodeFor('0.1.10')).toBeGreaterThan(versionCodeFor('0.1.9'));
    expect(versionCodeFor('0.2.0')).toBeGreaterThan(versionCodeFor('0.1.99'));
  });

  it('bumps versions', () => {
    expect(bumpVersion('0.1.9', 'patch')).toBe('0.1.10');
    expect(bumpVersion('0.1.9', 'minor')).toBe('0.2.0');
    expect(bumpVersion('0.1.9', 'major')).toBe('1.0.0');
  });

  it('rejects versions that would break versionCode ordering', () => {
    expect(() => versionCodeFor('0.100.0')).toThrow();
    expect(() => versionCodeFor('1.0.0-beta')).toThrow();
  });
});
