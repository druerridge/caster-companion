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

  it('opens the full rulebook PDF', async () => {
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByTestId('rulebook'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://pub-a3dc1f83df6d45f0a279ae0036773e78.r2.dev/media/legacy/downloads/metazoo-full-base-set-rules.pdf',
    );
  });

  it('shows an error if the link cannot be opened', async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('no handler'));
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByTestId('how-to-play'));
    expect(await screen.findByText("Couldn't open link")).toBeTruthy();
    expect(screen.queryByLabelText('Cancel')).toBeNull();
    await fireEvent.press(screen.getByLabelText('OK'));
    expect(screen.queryByText("Couldn't open link")).toBeNull();
  });
});
