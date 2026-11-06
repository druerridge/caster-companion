import { useCallback, useEffect, useRef, useState } from 'react';

import {
  NEW_GAME,
  gameReducer,
  parseGameState,
  type GameAction,
  type GameState,
} from '@/domain/game';
import { parseMissionPoints } from '@/domain/missionPoints';
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

async function loadGame(): Promise<GameState> {
  const game = await load(GAME_KEY);
  if (game) return game;
  const legacyPoints = await load(LEGACY_MISSION_POINTS_KEY);
  return legacyPoints ? { ...NEW_GAME, points: legacyPoints } : NEW_GAME;
}

/**
 * Game state that survives the app being killed. `hydrated` is false until
 * saved state has loaded, so the UI doesn't flash a "new game" screen first.
 */
export function useGame() {
  const [state, setState] = useState<GameState>(NEW_GAME);
  const [hydrated, setHydrated] = useState(false);
  // Don't let a slow initial load clobber actions taken before it finished.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadGame().then((stored) => {
      if (cancelled) return;
      if (!touched.current) setState(stored);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    touched.current = true;
    setState((current) => {
      const next = gameReducer(current, action);
      if (next !== current) void save(GAME_KEY, next);
      return next;
    });
  }, []);

  return { state, hydrated, dispatch };
}
