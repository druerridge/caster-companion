import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { MISSION_POINTS_KEY } from '@/features/tracker/useMissionPoints';

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const score = (side: 'top' | 'bottom') => screen.getByTestId(`mission-points-${side}`);
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

async function renderTracker() {
  await renderRouter('./src/app');
  await screen.findByTestId('mission-points-top');
}

describe('mission point tracker', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('starts both players at 0', async () => {
    await renderTracker();
    expect(score('top')).toHaveTextContent('0');
    expect(score('bottom')).toHaveTextContent('0');
  });

  it('tapping the right half adds and the left half subtracts, per player', async () => {
    await renderTracker();
    await press('Bottom player: increase mission points');
    await press('Bottom player: increase mission points');
    await press('Top player: increase mission points');
    await press('Bottom player: decrease mission points');
    expect(score('bottom')).toHaveTextContent('1');
    expect(score('top')).toHaveTextContent('1');
  });

  it('never goes below 0', async () => {
    await renderTracker();
    await press('Top player: decrease mission points');
    expect(score('top')).toHaveTextContent('0');
  });

  it('rotates the top half to face the opposite player', async () => {
    await renderTracker();
    expect(screen.getByTestId('player-half-top')).toHaveStyle({
      transform: [{ rotate: '180deg' }],
    });
    expect(screen.getByTestId('player-half-bottom')).not.toHaveStyle({
      transform: [{ rotate: '180deg' }],
    });
  });

  it('resets only after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderTracker();
    await press('Top player: increase mission points');

    await press('Reset mission points');
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    expect(score('top')).toHaveTextContent('1'); // nothing happens until confirmed

    await act(async () => buttons.find((b) => b.text === 'Cancel')?.onPress?.());
    expect(score('top')).toHaveTextContent('1');

    await press('Reset mission points');
    const confirm = alert.mock.calls[1]?.[2]?.find((b) => b.text === 'Reset');
    expect(confirm?.style).toBe('destructive');
    await act(async () => confirm?.onPress?.());
    expect(score('top')).toHaveTextContent('0');
  });

  it('saves scores and restores them on the next launch', async () => {
    await renderTracker();
    await press('Top player: increase mission points');
    await press('Bottom player: increase mission points');
    await press('Bottom player: increase mission points');
    const stored = await AsyncStorage.getItem(MISSION_POINTS_KEY.key);
    expect(JSON.parse(stored ?? 'null')).toEqual({ top: 1, bottom: 2 });

    await act(async () => screen.unmount());
    await renderTracker();
    await waitFor(() => expect(score('bottom')).toHaveTextContent('2'));
    expect(score('top')).toHaveTextContent('1');
  });

  it('keeps the screen awake while the tracker tab is focused', async () => {
    await renderTracker();
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('tracker');
    await fireEvent.press(screen.getByRole('button', { name: /Rules/ }));
    expect(deactivateKeepAwake).toHaveBeenCalledWith('tracker');
  });
});

describe('tracker layout', () => {
  it('puts the reset button in the middle band, outside both player halves', async () => {
    await renderRouter('./src/app');
    const band = await screen.findByTestId('middle-band');
    const reset = screen.getByLabelText('Reset mission points');
    const isInside = (node: typeof reset, container: typeof band): boolean =>
      node.parent === null ? false : node.parent === container || isInside(node.parent, container);
    expect(isInside(reset, band)).toBe(true);
    expect(isInside(reset, screen.getByTestId('player-half-top'))).toBe(false);
    expect(isInside(reset, screen.getByTestId('player-half-bottom'))).toBe(false);
  });
});
