// Whole-game state for the tracker. Pure logic, no React.

import {
  INITIAL_MISSION_POINTS,
  decrement,
  increment,
  parseMissionPoints,
  type MissionPoints,
  type Side,
} from './missionPoints';

export interface GameState {
  readonly points: MissionPoints;
  /** Who goes first this round; null until the players pick (or flip for) a starter. */
  readonly priority: Side | null;
}

export const NEW_GAME: GameState = { points: INITIAL_MISSION_POINTS, priority: null };

export type GameAction =
  | { type: 'increment'; side: Side }
  | { type: 'decrement'; side: Side }
  | { type: 'start'; first: Side }
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
      return { ...state, priority: action.first };
    case 'passPriority':
      return state.priority === null ? state : { ...state, priority: otherSide(state.priority) };
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
  return { points, priority };
}
