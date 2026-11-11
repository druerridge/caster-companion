import * as Linking from 'expo-linking';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { askRuling } from '@/features/rules/askClient';

jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  openURL: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/features/rules/askClient', () => ({ askRuling: jest.fn() }));

const ask = jest.mocked(askRuling);

async function askQuestion(text: string) {
  await renderRouter('./src/app', { initialUrl: '/ask' });
  await fireEvent.changeText(await screen.findByTestId('ask-input'), text);
  await fireEvent.press(screen.getByTestId('ask-submit'));
}

describe('Ask a Ruling screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is reachable from the Rules screen', async () => {
    await renderRouter('./src/app', { initialUrl: '/rules' });
    await fireEvent.press(await screen.findByTestId('ask-ruling'));
    expect(await screen.findByTestId('ask-input')).toBeTruthy();
  });

  it('shows the answer to a question', async () => {
    ask.mockResolvedValueOnce({ kind: 'answer', text: 'Give lasts until end of round.' });
    await askQuestion('  give vs gain?  ');
    expect(ask).toHaveBeenCalledWith('give vs gain?');
    expect(await screen.findByText('Give lasts until end of round.')).toBeTruthy();
    expect(screen.getByText('give vs gain?')).toBeTruthy();
  });

  it('does not send an empty question', async () => {
    await askQuestion('   ');
    expect(ask).not.toHaveBeenCalled();
  });

  it('says when there is no connection, without a handoff', async () => {
    ask.mockResolvedValueOnce({ kind: 'error', error: 'offline' });
    await askQuestion('give vs gain?');
    expect(await screen.findByText('No connection')).toBeTruthy();
    expect(screen.queryByTestId('handoff-chatgpt')).toBeNull();
  });

  it('offers a chat-app handoff when the daily quota is used up', async () => {
    ask.mockResolvedValueOnce({ kind: 'error', error: 'quota' });
    await askQuestion('give vs gain?');
    expect(await screen.findByText('Daily limit reached')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('handoff-chatgpt'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://chatgpt.com/?q=In%20MetaZoo%202025%2C%20give%20vs%20gain%3F',
    );
    await fireEvent.press(screen.getByTestId('handoff-claude'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://claude.ai/new?q=In%20MetaZoo%202025%2C%20give%20vs%20gain%3F',
    );
  });
});
