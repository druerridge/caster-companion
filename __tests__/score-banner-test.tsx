import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { GAME_KEY } from '@/features/tracker/useGame';
import { colors } from '@/theme/tokens';

jest.mock('@/features/tracker/timing', () => ({
  ...jest.requireActual('@/features/tracker/timing'),
  COIN_REVEAL_MS: 20,
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const ACTIVE_GAME = {
  points: { top: 12, bottom: 31 },
  priority: 'top',
  round: 3,
  startedAt: 1_700_000_000_000,
};

const seed = (game: object) => AsyncStorage.setItem(GAME_KEY.key, JSON.stringify(game));
const tab = (name: RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('score banner', () => {
  it('is hidden when no game is in progress', async () => {
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await screen.findByTestId('how-to-play');
    expect(screen.queryByTestId('score-banner')).toBeNull();
  });

  it('shows the score, round and priority on the Rules tab', async () => {
    await seed(ACTIVE_GAME);
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await screen.findByTestId('score-banner');
    expect(screen.getByTestId('score-banner-top')).toHaveTextContent('TOP12');
    expect(screen.getByTestId('score-banner-bottom')).toHaveTextContent('BOTTOM31');
    expect(screen.getByText('ROUND 3')).toBeTruthy();
    expect(screen.getByTestId('score-banner-top')).toHaveStyle({ borderColor: colors.priority });
    expect(screen.getByTestId('score-banner-bottom')).toHaveStyle({
      backgroundColor: colors.goalFill,
    });
  });

  it('shows on the Cryptids tab too', async () => {
    await seed(ACTIVE_GAME);
    await renderRouter('./src/app', { initialUrl: '/cryptids' });
    expect(await screen.findByTestId('score-banner')).toBeTruthy();
  });

  it('follows score changes made on the tracker', async () => {
    await seed(ACTIVE_GAME);
    await renderRouter('./src/app');
    await screen.findByTestId('middle-band');
    await fireEvent.press(screen.getByLabelText('Bottom player: increase mission points'));
    await tab(/Rules/);
    expect(await screen.findByTestId('score-banner-bottom')).toHaveTextContent('BOTTOM32');
  });

  it('opens the tracker when tapped', async () => {
    await seed(ACTIVE_GAME);
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByLabelText(/Open tracker/));
    expect(await screen.findByTestId('middle-band')).toBeTruthy();
  });

  it('stays closed for this game, and comes back for the next one', async () => {
    await seed(ACTIVE_GAME);
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByTestId('score-banner-close'));
    expect(screen.queryByTestId('score-banner')).toBeNull();

    // Still closed after visiting another tab.
    await tab(/Cryptids/);
    await screen.findByText('Coming soon.');
    expect(screen.queryByTestId('score-banner')).toBeNull();

    // New game on the tracker brings it back.
    await tab(/Tracker/);
    await fireEvent.press(await screen.findByLabelText('Reset game'));
    await fireEvent.press(await screen.findByText('New game'));
    await fireEvent.press(await screen.findByTestId('start-bottom'));
    await screen.findByTestId('middle-band');
    await tab(/Rules/);
    expect(await screen.findByTestId('score-banner')).toBeTruthy();
  });
});
