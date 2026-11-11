import * as Linking from 'expo-linking';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { askRuling } from '@/features/rules/askClient';

jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  openURL: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/features/rules/askClient', () => ({ askRuling: jest.fn() }));

const ask = jest.mocked(askRuling);

async function openRules() {
  await renderRouter('./src/app', { initialUrl: '/rules' });
}

async function askQuestion(text: string) {
  await openRules();
  await fireEvent.changeText(await screen.findByTestId('ask-input'), text);
  await fireEvent.press(screen.getByTestId('ask-submit'));
}

beforeEach(() => jest.clearAllMocks());

describe('Rules screen links', () => {
  it('opens the How to Play playlist on YouTube', async () => {
    await openRules();
    await fireEvent.press(await screen.findByTestId('how-to-play'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=e1YFtKowesk&list=PLfzooD1xfFPBSr63yk_f3l-v8aPT4FxdY',
    );
  });

  it('opens the full rules web page', async () => {
    await openRules();
    await fireEvent.press(await screen.findByTestId('rulebook'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.metazootcg.com/how-to-play/rules/full',
    );
  });

  it('shows an error if the link cannot be opened', async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('no handler'));
    await openRules();
    await fireEvent.press(await screen.findByTestId('how-to-play'));
    expect(await screen.findByText("Couldn't open link")).toBeTruthy();
    expect(screen.queryByLabelText('Cancel')).toBeNull();
    await fireEvent.press(screen.getByLabelText('OK'));
    expect(screen.queryByText("Couldn't open link")).toBeNull();
  });
});

describe('Rules screen question box', () => {
  it('is ready on the Rules screen with a placeholder', async () => {
    await openRules();
    expect(await screen.findByPlaceholderText('Ask a rules question')).toBeTruthy();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('shows the answer and clears the box', async () => {
    ask.mockResolvedValueOnce({ kind: 'answer', text: 'Give lasts until end of round.' });
    await askQuestion('  give vs gain?  ');
    expect(ask).toHaveBeenCalledWith('give vs gain?');
    expect(await screen.findByText('Give lasts until end of round.')).toBeTruthy();
    expect(screen.getByText('give vs gain?')).toBeTruthy();
    expect(screen.getByTestId('ask-input').props.value).toBe('');
  });

  it('sends from the keyboard too', async () => {
    ask.mockResolvedValueOnce({ kind: 'answer', text: 'Yes.' });
    await openRules();
    const box = await screen.findByTestId('ask-input');
    await fireEvent.changeText(box, 'is a lane a zone?');
    await fireEvent(box, 'submitEditing');
    expect(ask).toHaveBeenCalledWith('is a lane a zone?');
  });

  it('keeps earlier answers from this session', async () => {
    ask
      .mockResolvedValueOnce({ kind: 'answer', text: 'First answer.' })
      .mockResolvedValueOnce({ kind: 'answer', text: 'Second answer.' });
    await askQuestion('first?');
    await screen.findByText('First answer.');
    await fireEvent.changeText(screen.getByTestId('ask-input'), 'second?');
    await fireEvent.press(screen.getByTestId('ask-submit'));
    expect(await screen.findByText('Second answer.')).toBeTruthy();
    expect(screen.getByText('First answer.')).toBeTruthy();
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
