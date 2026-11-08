import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Animated, AppState, type AppStateStatus } from 'react-native';

import { STALE_AFTER_MS } from '@/domain/session';
import { CHANGE_BURST_MS, CHANGE_FADE_MS, CHANGE_HOLD_MS } from '@/features/tracker/timing';
import { GAME_KEY, LAST_ACTIVE_KEY, LEGACY_MISSION_POINTS_KEY } from '@/features/tracker/useGame';
import { colors } from '@/theme/tokens';

// Keep the coin reveal short so tests stay fast with real timers.
jest.mock('@/features/tracker/timing', () => ({
  ...jest.requireActual('@/features/tracker/timing'),
  COIN_REVEAL_MS: 20,
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

type Side = 'top' | 'bottom';
const score = (side: Side) => screen.getByTestId(`mission-points-${side}`);
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

/** Launch the app on the tracker; optionally pick who goes first. */
async function renderTracker(first?: Side) {
  await renderRouter('./src/app');
  if (first) {
    await fireEvent.press(await screen.findByTestId(`start-${first}`));
  }
}

const startedGame = async (first: Side = 'bottom') => {
  await renderTracker(first);
  await screen.findByTestId('middle-band');
};

const GAME_STATE = (game: object) => AsyncStorage.setItem(GAME_KEY.key, JSON.stringify(game));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('starting a game', () => {
  it('shows the start chooser for a new game', async () => {
    await renderTracker();
    expect(await screen.findByTestId('start-chooser')).toBeTruthy();
    expect(screen.queryByTestId('middle-band')).toBeNull();
  });

  it('rotates the top player section to face them', async () => {
    await renderTracker();
    expect(await screen.findByTestId('start-top')).toHaveStyle({
      transform: [{ rotate: '180deg' }],
    });
  });

  it.each<Side>(['top', 'bottom'])('lets the %s player claim first', async (side) => {
    await startedGame(side);
    expect(screen.getByTestId(`priority-badge-${side}`)).toBeTruthy();
    expect(screen.queryByTestId(`priority-badge-${side === 'top' ? 'bottom' : 'top'}`)).toBeNull();
  });

  it('flips a coin, shows the result, then starts with the winner first', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.2); // < 0.5 -> top
    await renderTracker();
    await screen.findByTestId('start-chooser');
    try {
      await press('Flip a coin');
      expect(screen.getByText('Top player wins the flip')).toBeTruthy();
      expect(screen.getByText('You go first!')).toBeTruthy();

      // Players can't change the outcome during the reveal.
      expect(screen.getByTestId('start-bottom')).toBeDisabled();
      expect(screen.queryByTestId('middle-band')).toBeNull();

      expect(await screen.findByTestId('priority-badge-top')).toBeTruthy();
    } finally {
      random.mockRestore();
    }
  });
});

describe('mission points', () => {
  it('starts both players at 0', async () => {
    await startedGame();
    expect(score('top')).toHaveTextContent('0');
    expect(score('bottom')).toHaveTextContent('0');
  });

  it('tapping the right half adds and the left half subtracts, per player', async () => {
    await startedGame();
    await press('Bottom player: increase mission points');
    await press('Bottom player: increase mission points');
    await press('Top player: increase mission points');
    await press('Bottom player: decrease mission points');
    expect(score('bottom')).toHaveTextContent('1');
    expect(score('top')).toHaveTextContent('1');
  });

  it('never goes below 0', async () => {
    await startedGame();
    await press('Top player: decrease mission points');
    expect(score('top')).toHaveTextContent('0');
  });

  it('rotates the top half to face the opposite player', async () => {
    await startedGame();
    expect(screen.getByTestId('player-half-top')).toHaveStyle({
      transform: [{ rotate: '180deg' }],
    });
    expect(screen.getByTestId('player-half-bottom')).not.toHaveStyle({
      transform: [{ rotate: '180deg' }],
    });
  });
});

describe('change indicator', () => {
  const change = (side: Side) => screen.queryByTestId(`mission-points-change-${side}`);
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('shows the net change of a quick burst of taps, then hides', async () => {
    await startedGame();
    expect(change('bottom')).toBeNull();

    await press('Bottom player: increase mission points');
    expect(change('bottom')).toHaveTextContent('+1');
    await wait(1000);
    await press('Bottom player: increase mission points');
    await press('Bottom player: increase mission points');
    expect(change('bottom')).toHaveTextContent('+3');
    await press('Bottom player: decrease mission points');
    expect(change('bottom')).toHaveTextContent('+2');
    expect(change('top')).toBeNull();

    await wait(1000); // still within the window of the last tap
    expect(change('bottom')).toHaveTextContent('+2');
    await wait(600);
    expect(change('bottom')).toBeNull();
    expect(score('bottom')).toHaveTextContent('2');

    // A new burst starts counting from the current score.
    await press('Bottom player: decrease mission points');
    expect(change('bottom')).toHaveTextContent('−1');
  });

  it('holds fully visible, then fades out exactly as the burst ends', async () => {
    // The native-driven fade doesn't advance under Jest, so check its schedule.
    const delay = jest.spyOn(Animated, 'delay');
    const timing = jest.spyOn(Animated, 'timing');
    try {
      await startedGame();
      await press('Bottom player: increase mission points');
      expect(screen.getByTestId('mission-points-change-fade-bottom')).toHaveStyle({ opacity: 1 });
      expect(delay).toHaveBeenLastCalledWith(CHANGE_HOLD_MS);
      expect(timing).toHaveBeenLastCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({ toValue: 0, duration: CHANGE_FADE_MS }),
      );
      expect(CHANGE_HOLD_MS + CHANGE_FADE_MS).toBe(CHANGE_BURST_MS);
    } finally {
      delay.mockRestore();
      timing.mockRestore();
    }
  });

  it('hides when the burst nets to zero', async () => {
    await startedGame();
    await press('Top player: increase mission points');
    await press('Top player: decrease mission points');
    expect(change('top')).toBeNull();
  });

  it('ignores taps that do not change the score', async () => {
    await startedGame();
    await press('Top player: decrease mission points');
    expect(change('top')).toBeNull();
    await press('Top player: increase mission points');
    await press('Top player: decrease mission points');
    await press('Top player: decrease mission points');
    expect(change('top')).toBeNull();
  });
});

describe('reaching 30 mission points', () => {
  const fill = (side: Side) => screen.getByTestId(`player-half-${side}-fill`);

  it("changes that player's background at 30 and keeps counting", async () => {
    await GAME_STATE({ points: { top: 0, bottom: 29 }, priority: 'top' });
    await renderTracker();
    await screen.findByTestId('middle-band');
    expect(fill('bottom')).toHaveStyle({ backgroundColor: colors.scrim });

    await press('Bottom player: increase mission points');
    expect(fill('bottom')).toHaveStyle({ backgroundColor: colors.goalFill });
    expect(fill('top')).toHaveStyle({ backgroundColor: colors.scrim });

    await press('Bottom player: increase mission points');
    expect(score('bottom')).toHaveTextContent('31');
    expect(fill('bottom')).toHaveStyle({ backgroundColor: colors.goalFill });

    await press('Bottom player: decrease mission points');
    await press('Bottom player: decrease mission points');
    expect(fill('bottom')).toHaveStyle({ backgroundColor: colors.scrim });
  });
});

describe('priority', () => {
  it('tapping the FIRST badge passes priority to the other player', async () => {
    await startedGame('bottom');
    await press('Bottom player goes first. Pass priority');
    expect(screen.getByTestId('priority-badge-top')).toBeTruthy();
    expect(screen.queryByTestId('priority-badge-bottom')).toBeNull();
    await press('Top player goes first. Pass priority');
    expect(screen.getByTestId('priority-badge-bottom')).toBeTruthy();
  });

  it('passing priority leaves scores alone', async () => {
    await startedGame('bottom');
    await press('Top player: increase mission points');
    await press('Bottom player goes first. Pass priority');
    expect(score('top')).toHaveTextContent('1');
  });
});

describe('round counter drawer', () => {
  const round = (n: number) => screen.queryByLabelText(`Round ${n}`);
  /** Open the drawer and simulate its first layout (Jest doesn't lay out). */
  const openMenu = async () => {
    await press('Open menu');
    await fireEvent(screen.getByTestId('side-drawer-content'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 600 } },
    });
  };

  it('keeps the round hidden until the menu is opened', async () => {
    await startedGame();
    expect(round(1)).toBeNull();
    await openMenu();
    expect(round(1)).toBeTruthy();
    expect(screen.getByTestId('round-number')).toHaveTextContent('1');
  });

  it('closes from the menu button', async () => {
    await startedGame();
    await press('Open menu');
    await press('Close menu');
    expect(round(1)).toBeNull();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('closes on a tap outside, without scoring', async () => {
    await startedGame();
    await press('Open menu');
    await fireEvent.press(screen.getByTestId('drawer-backdrop'));
    expect(round(1)).toBeNull();
    expect(screen.queryByTestId('drawer-backdrop')).toBeNull();
    expect(score('top')).toHaveTextContent('0');
    expect(score('bottom')).toHaveTextContent('0');
  });

  it('counts a round each time priority is passed', async () => {
    await startedGame('bottom');
    await press('Bottom player goes first. Pass priority');
    await press('Top player goes first. Pass priority');
    await openMenu();
    expect(round(3)).toBeTruthy();
  });

  it('stretches the drawer panel to the full drawer height', async () => {
    // Regression: without flex: 1 the frame collapsed to its borders on device.
    await startedGame();
    await press('Open menu');
    expect(screen.getByTestId('side-drawer-frame')).toHaveStyle({ flex: 1 });
  });

  it('rotates the round to run along the drawer', async () => {
    await startedGame();
    await openMenu();
    expect(screen.getByTestId('side-drawer-rotated')).toHaveStyle({
      width: 600,
      height: 100,
      transform: [{ rotate: '-90deg' }],
    });
  });

  it('starts back at round 1, drawer closed, after a new game', async () => {
    await startedGame('bottom');
    await press('Bottom player goes first. Pass priority');
    await openMenu();
    await press('Dismiss menu');
    await press('Reset game');
    await press('New game');
    await fireEvent.press(screen.getByTestId('start-top'));
    expect(round(1)).toBeNull();
    await openMenu();
    expect(round(1)).toBeTruthy();
  });
});

describe('reset', () => {
  it('only resets after confirmation, then returns to the start chooser', async () => {
    await startedGame('top');
    await press('Top player: increase mission points');

    await press('Reset game');
    expect(screen.getByText('Start a new game?')).toBeTruthy();
    await press('Cancel');
    expect(screen.queryByText('Start a new game?')).toBeNull();
    expect(score('top')).toHaveTextContent('1');
    expect(screen.getByTestId('priority-badge-top')).toBeTruthy();

    await press('Reset game');
    await press('New game');
    expect(screen.getByTestId('start-chooser')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('start-bottom'));
    expect(score('top')).toHaveTextContent('0');
  });

  it('cancels the reset when tapping outside the dialog', async () => {
    await startedGame('top');
    await press('Top player: increase mission points');
    await press('Reset game');
    await fireEvent.press(screen.getByTestId('dialog-backdrop'));
    expect(screen.queryByText('Start a new game?')).toBeNull();
    expect(score('top')).toHaveTextContent('1');
  });

  it('cancels the reset on the Android back button', async () => {
    await startedGame('top');
    await press('Top player: increase mission points');
    await press('Reset game');
    await fireEvent(screen.getByTestId('dialog'), 'requestClose');
    expect(screen.queryByText('Start a new game?')).toBeNull();
    expect(score('top')).toHaveTextContent('1');
  });

  it('keeps the reset button in the middle band, outside both player halves', async () => {
    await startedGame();
    const band = screen.getByTestId('middle-band');
    const reset = screen.getByLabelText('Reset game');
    const isInside = (node: typeof reset, container: typeof band): boolean =>
      node.parent === null ? false : node.parent === container || isInside(node.parent, container);
    expect(isInside(reset, band)).toBe(true);
    expect(isInside(reset, screen.getByTestId('player-half-top'))).toBe(false);
    expect(isInside(reset, screen.getByTestId('player-half-bottom'))).toBe(false);
  });
});

describe('persistence', () => {
  it('restores scores and priority on the next launch', async () => {
    await startedGame('top');
    await press('Top player: increase mission points');
    await press('Top player goes first. Pass priority');
    const stored = await AsyncStorage.getItem(GAME_KEY.key);
    expect(JSON.parse(stored ?? 'null')).toEqual({
      points: { top: 1, bottom: 0 },
      priority: 'bottom',
      round: 2,
    });

    await act(async () => screen.unmount());
    await renderRouter('./src/app');
    await waitFor(() => expect(screen.getByTestId('priority-badge-bottom')).toBeTruthy());
    expect(score('top')).toHaveTextContent('1');
  });

  it('carries over scores saved by v0.2.x', async () => {
    await AsyncStorage.setItem(
      LEGACY_MISSION_POINTS_KEY.key,
      JSON.stringify({ top: 4, bottom: 6 }),
    );
    await startedGame('top');
    expect(score('top')).toHaveTextContent('4');
    expect(score('bottom')).toHaveTextContent('6');
  });
});

describe('stale games', () => {
  const SAVED = { points: { top: 3, bottom: 5 }, priority: 'top' } as const;

  it('restores a game closed for under 15 minutes', async () => {
    await GAME_STATE(SAVED);
    await AsyncStorage.setItem(
      LAST_ACTIVE_KEY.key,
      JSON.stringify(Date.now() - STALE_AFTER_MS + 60_000),
    );
    await renderTracker();
    await screen.findByTestId('middle-band');
    expect(score('bottom')).toHaveTextContent('5');
  });

  it('starts fresh after the app was closed for over 15 minutes, and stays fresh', async () => {
    await GAME_STATE(SAVED);
    await AsyncStorage.setItem(
      LAST_ACTIVE_KEY.key,
      JSON.stringify(Date.now() - STALE_AFTER_MS - 1),
    );
    await renderTracker();
    expect(await screen.findByTestId('start-chooser')).toBeTruthy();

    // A quick reopen must not bring the old game back.
    await act(async () => screen.unmount());
    await renderTracker();
    expect(await screen.findByTestId('start-chooser')).toBeTruthy();
  });

  it('applies the same rule when returning from the background', async () => {
    // renderRouter installs fake timers, so the clock is driven with setSystemTime.
    const advance = (ms: number) => jest.setSystemTime(Date.now() + ms);
    // The React Native jest preset mocks AppState; replay its registered listeners.
    const emit = (status: AppStateStatus) =>
      act(() => {
        for (const [, listener] of jest.mocked(AppState.addEventListener).mock.calls) {
          listener(status);
        }
      });
    await GAME_STATE(SAVED);
    await renderTracker();
    await screen.findByTestId('middle-band');

    await emit('background');
    advance(STALE_AFTER_MS);
    await emit('active');
    expect(score('bottom')).toHaveTextContent('5');

    await emit('background');
    advance(STALE_AFTER_MS + 1);
    await emit('active');
    expect(await screen.findByTestId('start-chooser')).toBeTruthy();
  });
});

describe('keep awake', () => {
  it('keeps the screen awake while the tracker tab is focused', async () => {
    await renderTracker();
    await screen.findByTestId('start-chooser');
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('tracker');
    await fireEvent.press(screen.getByRole('button', { name: /Rules/ }));
    expect(deactivateKeepAwake).toHaveBeenCalledWith('tracker');
  });
});
