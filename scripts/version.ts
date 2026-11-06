export type Bump = 'major' | 'minor' | 'patch';

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): SemVer {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Not a plain x.y.z version: "${version}"`);
  const [, major, minor, patch] = match.map(Number) as [number, number, number, number];
  if (minor > 99 || patch > 99) throw new Error(`minor/patch must be <= 99: "${version}"`);
  return { major, minor, patch };
}

/** 1.2.3 -> 10203. Monotonic as long as minor/patch stay <= 99. */
export function versionCodeFor(version: string): number {
  const { major, minor, patch } = parseVersion(version);
  return major * 10000 + minor * 100 + patch;
}

export function bumpVersion(version: string, bump: Bump): string {
  const { major, minor, patch } = parseVersion(version);
  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}
