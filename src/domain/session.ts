// When a saved game counts as abandoned. Pure logic, no React.

/** A game left closed for longer than this starts fresh. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * True if the app was last active more than STALE_AFTER_MS before `now`.
 * Unknown (null) means "not stale", so upgrades never lose a game in progress.
 */
export function isStale(lastActiveAt: number | null, now: number): boolean {
  return lastActiveAt !== null && now - lastActiveAt > STALE_AFTER_MS;
}

/** Validate a persisted timestamp. */
export function parseTimestamp(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}
