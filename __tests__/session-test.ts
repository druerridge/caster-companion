import { STALE_AFTER_MS, isStale, parseTimestamp } from '@/domain/session';

describe('isStale', () => {
  const now = 1_000_000_000;

  it('is not stale when there is no record of the last session', () => {
    expect(isStale(null, now)).toBe(false);
  });

  it('is not stale at exactly 15 minutes', () => {
    expect(STALE_AFTER_MS).toBe(15 * 60 * 1000);
    expect(isStale(now - STALE_AFTER_MS, now)).toBe(false);
  });

  it('is stale after 15 minutes', () => {
    expect(isStale(now - STALE_AFTER_MS - 1, now)).toBe(true);
  });
});

describe('parseTimestamp', () => {
  it.each([[0], [1_700_000_000_000]])('accepts %p', (v) => expect(parseTimestamp(v)).toBe(v));
  it.each([[-1], [1.5], ['123'], [null], [{}]])('rejects %p', (v) =>
    expect(parseTimestamp(v)).toBeNull(),
  );
});
