import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

describe('app navigation', () => {
  it('opens on the Tracker tab', async () => {
    await renderRouter('./src/app');
    expect(screen).toHavePathname('/');
    expect(
      await screen.findByText('Mission points, priority, round counter and game timer.'),
    ).toBeTruthy();
  });

  it.each([
    ['Rules', '/rules', 'Offline rulebook, errata and quick reference.'],
    ['Cryptids', '/cryptids', 'Search cryptids by name or location.'],
  ])('switches to the %s tab', async (tab, path, text) => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(tab) }));
    expect(screen).toHavePathname(path);
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('opens the About screen with the unofficial disclaimer', async () => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByLabelText('About'));
    expect(screen).toHavePathname('/about');
    expect(await screen.findByText(/Not affiliated with/)).toBeTruthy();
  });
});
