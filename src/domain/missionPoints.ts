// Mission point scores for a two-player game. Pure logic, no React.

export type Side = 'top' | 'bottom';

export const SIDES: readonly Side[] = ['top', 'bottom'];

export type MissionPoints = Readonly<Record<Side, number>>;

export const INITIAL_MISSION_POINTS: MissionPoints = { top: 0, bottom: 0 };

export function increment(points: MissionPoints, side: Side): MissionPoints {
  return { ...points, [side]: points[side] + 1 };
}

/** Scores never go below zero. */
export function decrement(points: MissionPoints, side: Side): MissionPoints {
  if (points[side] === 0) return points;
  return { ...points, [side]: points[side] - 1 };
}

/** Validate untrusted (e.g. persisted) data; returns null if it isn't a valid score. */
export function parseMissionPoints(value: unknown): MissionPoints | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const valid = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
  if (!valid(record.top) || !valid(record.bottom)) return null;
  return { top: record.top, bottom: record.bottom };
}

/** Reaching this many mission points changes the player's background; counting continues. */
export const MISSION_POINT_GOAL = 30;

export const hasReachedGoal = (points: number): boolean => points >= MISSION_POINT_GOAL;

/** Signed change label, e.g. "+3" or "−2" (true minus sign); empty for no change. */
export function formatChange(delta: number): string {
  if (delta === 0) return '';
  return delta > 0 ? `+${delta}` : `−${-delta}`;
}
