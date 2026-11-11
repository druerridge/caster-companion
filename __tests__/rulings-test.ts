import {
  MAX_QUESTION_CHARS,
  cleanAnswer,
  errorCopy,
  handoffPrompt,
  handoffUrl,
  parseAskResponse,
  validateQuestion,
} from '../src/domain/rulings';

describe('validateQuestion', () => {
  it('trims and accepts a normal question', () => {
    expect(validateQuestion('  what does gain mean? ')).toEqual({
      ok: true,
      question: 'what does gain mean?',
    });
  });

  it('rejects empty, whitespace and non-strings', () => {
    expect(validateQuestion('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(validateQuestion(undefined)).toEqual({ ok: false, reason: 'empty' });
    expect(validateQuestion(42)).toEqual({ ok: false, reason: 'empty' });
  });

  it('caps the length, measured after trimming', () => {
    expect(validateQuestion('x'.repeat(MAX_QUESTION_CHARS)).ok).toBe(true);
    expect(validateQuestion(` ${'x'.repeat(MAX_QUESTION_CHARS)} `).ok).toBe(true);
    expect(validateQuestion('x'.repeat(MAX_QUESTION_CHARS + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });
});

describe('parseAskResponse', () => {
  it('reads an answer', () => {
    expect(parseAskResponse({ answer: 'Give lasts until end of round.' })).toEqual({
      kind: 'answer',
      text: 'Give lasts until end of round.',
    });
  });

  it('reads known Worker errors', () => {
    expect(parseAskResponse({ error: 'quota' })).toEqual({ kind: 'error', error: 'quota' });
    expect(parseAskResponse({ error: 'rate_limited' })).toEqual({
      kind: 'error',
      error: 'rate_limited',
    });
  });

  it('treats anything else as unknown', () => {
    for (const body of [null, 'oops', {}, { answer: '  ' }, { error: 'weird' }]) {
      expect(parseAskResponse(body)).toEqual({ kind: 'error', error: 'unknown' });
    }
  });
});

describe('cleanAnswer', () => {
  it('strips Markdown the model sneaks in', () => {
    expect(cleanAnswer('## Short answer\n**Give** is temporary.\n\n\n\n- one\n* two')).toBe(
      'Short answer\nGive is temporary.\n\n• one\n• two',
    );
  });
});

describe('errorCopy', () => {
  it('offers a chat-app handoff only when retrying here will not help', () => {
    expect(errorCopy('quota').offerHandoff).toBe(true);
    expect(errorCopy('disabled').offerHandoff).toBe(true);
    expect(errorCopy('upstream').offerHandoff).toBe(true);
    expect(errorCopy('offline').offerHandoff).toBe(false);
    expect(errorCopy('rate_limited').offerHandoff).toBe(false);
  });
});

describe('handoff', () => {
  it('prefixes the question the way the owner asks it', () => {
    expect(handoffPrompt('what does gain mean?')).toBe('In MetaZoo 2025, what does gain mean?');
    expect(handoffPrompt('In MetaZoo, what is a lane?')).toBe('In MetaZoo, what is a lane?');
  });

  it('builds prefilled chat links', () => {
    expect(handoffUrl('chatgpt', 'gain vs give?')).toBe(
      'https://chatgpt.com/?q=In%20MetaZoo%202025%2C%20gain%20vs%20give%3F',
    );
    expect(handoffUrl('claude', 'a & b')).toBe(
      'https://claude.ai/new?q=In%20MetaZoo%202025%2C%20a%20%26%20b',
    );
  });
});
