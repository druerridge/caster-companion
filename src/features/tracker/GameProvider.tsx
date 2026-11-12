import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { GameAction, GameState } from '@/domain/game';

import { useGame } from './useGame';

interface GameContextValue {
  state: GameState;
  hydrated: boolean;
  dispatch: (action: GameAction) => void;
  /** The score banner was closed for the current game. */
  bannerDismissed: boolean;
  dismissBanner: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Shares one game between the tracker and the score banner on other tabs.
 * Closing the banner lasts for the current game (identified by its start
 * time); a new game brings it back. Not persisted.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const { state, hydrated, dispatch } = useGame();
  // undefined = never closed; otherwise the start time of the game it was closed for.
  const [dismissedFor, setDismissedFor] = useState<number | null | undefined>(undefined);
  const startedAt = state.startedAt;
  const dismissBanner = useCallback(() => setDismissedFor(startedAt), [startedAt]);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      dispatch,
      bannerDismissed: state.priority !== null && dismissedFor === startedAt,
      dismissBanner,
    }),
    [state, hydrated, dispatch, dismissedFor, startedAt, dismissBanner],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGameContext must be used inside <GameProvider>');
  return value;
}
