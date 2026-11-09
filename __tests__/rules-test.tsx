import * as Linking from 'expo-linking';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  openURL: jest.fn(() => Promise.resolve(true)),
}));

describe('Rules screen', () => {
  it('opens the How to Play playlist on YouTube', async () => {
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByTestId('how-to-play'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=e1YFtKowesk&list=PLfzooD1xfFPBSr63yk_f3l-v8aPT4FxdY',
    );
  });
});
