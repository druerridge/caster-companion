import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

const pressTab = async (tab: string) =>
  fireEvent.press(await screen.findByRole('button', { name: new RegExp(tab) }));

describe('app navigation', () => {
  it('opens on the Tracker tab', async () => {
    await renderRouter('./src/app');
    expect(screen).toHavePathname('/');
    expect(await screen.findByTestId('start-chooser')).toBeTruthy();
  });

  it('puts the Tracker tab in the middle', async () => {
    await renderRouter('./src/app');
    await screen.findByTestId('start-chooser');
    const tabs = screen
      .getAllByRole('button')
      .map((b) => /Rules|Tracker|Cryptids/.exec(String(b.props.accessibilityLabel))?.[0])
      .filter(Boolean);
    expect(tabs).toEqual(['Rules', 'Tracker', 'Cryptids']);
  });

  it.each([
    ['Rules', '/rules', 'Errata and offline quick reference.'],
    ['Cryptids', '/cryptids', 'Search cryptids by name or location.'],
  ])('switches to the %s tab', async (tab, path, text) => {
    await renderRouter('./src/app');
    await pressTab(tab);
    expect(screen).toHavePathname(path);
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('opens the About screen with the unofficial disclaimer', async () => {
    await renderRouter('./src/app');
    await pressTab('Rules'); // the Tracker tab is full-bleed, without a header
    await fireEvent.press(await screen.findByLabelText('About'));
    expect(screen).toHavePathname('/about');
    expect(await screen.findByText(/Not affiliated with/)).toBeTruthy();
  });
});
