import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { GAME_KEY, LEGACY_MISSION_POINTS_KEY } from '@/features/tracker/useGame';

// Keep the coin reveal short so tests stay fast with real timers.
jest.mock('@/features/tracker/timing', () => ({ COIN_REVEAL_MS: 20 }));

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

describe('keep awake', () => {
  it('keeps the screen awake while the tracker tab is focused', async () => {
    await renderTracker();
    await screen.findByTestId('start-chooser');
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('tracker');
    await fireEvent.press(screen.getByRole('button', { name: /Rules/ }));
    expect(deactivateKeepAwake).toHaveBeenCalledWith('tracker');
  });
});
