// Whole-game state for the tracker. Pure logic, no React.

import {
  INITIAL_MISSION_POINTS,
  decrement,
  increment,
  parseMissionPoints,
  type MissionPoints,
  type Side,
} from './missionPoints';
import { parseTimestamp } from './session';

export interface GameState {
  readonly points: MissionPoints;
  /** Who goes first this round; null until the players pick (or flip for) a starter. */
  readonly priority: Side | null;
  /** Current round, from 1; each priority pass starts the next round. */
  readonly round: number;
  /** When the game started (epoch ms); null before it starts, or if saved before the timer. */
  readonly startedAt: number | null;
}

export const NEW_GAME: GameState = {
  points: INITIAL_MISSION_POINTS,
  priority: null,
  round: 1,
  startedAt: null,
};

export type GameAction =
  | { type: 'increment'; side: Side }
  | { type: 'decrement'; side: Side }
  /** `at` is the start time (epoch ms), passed in to keep the reducer pure. */
  | { type: 'start'; first: Side; at: number }
  | { type: 'passPriority' }
  | { type: 'reset' };

export const otherSide = (side: Side): Side => (side === 'top' ? 'bottom' : 'top');

/** Fair coin. `random` is injectable for tests. */
export const flipCoin = (random: () => number = Math.random): Side =>
  random() < 0.5 ? 'top' : 'bottom';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'increment':
      return { ...state, points: increment(state.points, action.side) };
    case 'decrement': {
      const points = decrement(state.points, action.side);
      return points === state.points ? state : { ...state, points };
    }
    case 'start':
      return { ...state, priority: action.first, round: 1, startedAt: action.at };
    case 'passPriority':
      return state.priority === null
        ? state
        : { ...state, priority: otherSide(state.priority), round: state.round + 1 };
    case 'reset':
      return NEW_GAME;
  }
}

/** Validate untrusted (e.g. persisted) data. */
export function parseGameState(value: unknown): GameState | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const points = parseMissionPoints(record.points);
  const priority = record.priority;
  if (!points || !(priority === null || priority === 'top' || priority === 'bottom')) return null;
  // Games saved before the round counter (v0.4.x) have no round; resume at 1.
  const round = record.round === undefined ? 1 : record.round;
  if (!Number.isSafeInteger(round) || (round as number) < 1) return null;
  // Games saved before the timer (v0.5.x) have no start time; the clock shows as unknown.
  const startedAt = record.startedAt === undefined ? null : record.startedAt;
  if (startedAt !== null && parseTimestamp(startedAt) === null) return null;
  return { points, priority, round: round as number, startedAt: startedAt as number | null };
}

/**
 * Elapsed game time as "05:41", or "1:05:41" past an hour. Negative spans
 * (a clock set backwards) show as 00:00.
 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
