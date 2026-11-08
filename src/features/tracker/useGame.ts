import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  NEW_GAME,
  gameReducer,
  parseGameState,
  type GameAction,
  type GameState,
} from '@/domain/game';
import { parseMissionPoints } from '@/domain/missionPoints';
import { isStale, parseTimestamp } from '@/domain/session';
import { load, save, type PersistedKey } from '@/storage/persisted';

export const GAME_KEY: PersistedKey<GameState> = {
  key: 'tracker.game.v1',
  parse: parseGameState,
};

/** v0.2.x stored only mission points; carried over into the game state. */
export const LEGACY_MISSION_POINTS_KEY = {
  key: 'tracker.missionPoints.v1',
  parse: parseMissionPoints,
};

/** When the app was last in the foreground; decides whether a saved game is stale. */
export const LAST_ACTIVE_KEY: PersistedKey<number> = {
  key: 'tracker.lastActiveAt.v1',
  parse: parseTimestamp,
};

const markActive = (now = Date.now()) => void save(LAST_ACTIVE_KEY, now);

async function loadGame(): Promise<GameState> {
  const lastActiveAt = await load(LAST_ACTIVE_KEY);
  if (isStale(lastActiveAt, Date.now())) {
    // Persist the fresh start, so a quick reopen doesn't bring the old game back.
    await save(GAME_KEY, NEW_GAME);
    return NEW_GAME;
  }
  const game = await load(GAME_KEY);
  if (game) return game;
  const legacyPoints = await load(LEGACY_MISSION_POINTS_KEY);
  return legacyPoints ? { ...NEW_GAME, points: legacyPoints } : NEW_GAME;
}

/**
 * Game state that survives the app being killed. `hydrated` is false until
 * saved state has loaded, so the UI doesn't flash a "new game" screen first.
 * A game left closed (killed or in the background) for over 15 minutes
 * starts fresh.
 */
export function useGame() {
  const [state, setState] = useState<GameState>(NEW_GAME);
  const [hydrated, setHydrated] = useState(false);
  // Don't let a slow initial load clobber actions taken before it finished.
  const touched = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGame().then((stored) => {
      if (cancelled) return;
      if (!touched.current) setState(stored);
      setHydrated(true);
      markActive();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The app may be backgrounded rather than killed; apply the same rule on return.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const now = Date.now();
      if (next === 'background') {
        backgroundedAt.current = now;
      } else if (next === 'active') {
        if (isStale(backgroundedAt.current, now)) {
          touched.current = true;
          setState(NEW_GAME);
          void save(GAME_KEY, NEW_GAME);
        }
        backgroundedAt.current = null;
      } else {
        return;
      }
      markActive(now);
    });
    return () => subscription.remove();
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    touched.current = true;
    setState((current) => {
      const next = gameReducer(current, action);
      if (next !== current) void save(GAME_KEY, next);
      return next;
    });
    markActive();
  }, []);

  return { state, hydrated, dispatch };
}
