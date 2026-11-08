import {
  NEW_GAME,
  flipCoin,
  formatElapsed,
  gameReducer,
  otherSide,
  parseGameState,
} from '@/domain/game';

const T0 = 1_800_000_000_000;

describe('game reducer', () => {
  it('starts with no priority, zero points, round 1', () => {
    expect(NEW_GAME).toEqual({
      points: { top: 0, bottom: 0 },
      priority: null,
      round: 1,
      startedAt: null,
    });
  });

  it('starts with the chosen player first', () => {
    expect(gameReducer(NEW_GAME, { type: 'start', first: 'top', at: T0 }).priority).toBe('top');
  });

  it('passes priority back and forth', () => {
    let state = gameReducer(NEW_GAME, { type: 'start', first: 'bottom', at: T0 });
    state = gameReducer(state, { type: 'passPriority' });
    expect(state.priority).toBe('top');
    state = gameReducer(state, { type: 'passPriority' });
    expect(state.priority).toBe('bottom');
  });

  it('ignores passing priority before the game has started', () => {
    expect(gameReducer(NEW_GAME, { type: 'passPriority' })).toBe(NEW_GAME);
  });

  it('scores without touching priority', () => {
    const started = gameReducer(NEW_GAME, { type: 'start', first: 'top', at: T0 });
    const scored = gameReducer(started, { type: 'increment', side: 'bottom' });
    expect(scored).toEqual({
      points: { top: 0, bottom: 1 },
      priority: 'top',
      round: 1,
      startedAt: T0,
    });
    expect(gameReducer(started, { type: 'decrement', side: 'top' })).toBe(started);
  });

  it('reset clears points and priority', () => {
    let state = gameReducer(NEW_GAME, { type: 'start', first: 'top', at: T0 });
    state = gameReducer(state, { type: 'increment', side: 'top' });
    expect(gameReducer(state, { type: 'reset' })).toEqual(NEW_GAME);
  });

  it('each priority pass starts the next round', () => {
    let state = gameReducer(NEW_GAME, { type: 'start', first: 'top', at: T0 });
    expect(state.round).toBe(1);
    state = gameReducer(state, { type: 'passPriority' });
    state = gameReducer(state, { type: 'passPriority' });
    expect(state.round).toBe(3);
    expect(gameReducer(state, { type: 'increment', side: 'top' }).round).toBe(3);
    expect(gameReducer(state, { type: 'reset' }).round).toBe(1);
  });

  it('does not count rounds before the game has started', () => {
    expect(gameReducer(NEW_GAME, { type: 'passPriority' }).round).toBe(1);
  });

  it('records when the game started and clears it on reset', () => {
    const started = gameReducer(NEW_GAME, { type: 'start', first: 'top', at: T0 });
    expect(started.startedAt).toBe(T0);
    const passed = gameReducer(started, { type: 'passPriority' });
    expect(passed.startedAt).toBe(T0);
    expect(gameReducer(passed, { type: 'reset' }).startedAt).toBeNull();
  });

  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [5 * 60_000 + 41_000, '05:41'],
    [59 * 60_000 + 59_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_600_000 + 5 * 60_000 + 41_000, '1:05:41'],
    [-5000, '00:00'],
  ])('formats %p ms as %p', (ms, text) => expect(formatElapsed(ms)).toBe(text));

  it('otherSide flips sides', () => {
    expect(otherSide('top')).toBe('bottom');
    expect(otherSide('bottom')).toBe('top');
  });

  it('flipCoin maps the random draw to a side', () => {
    expect(flipCoin(() => 0)).toBe('top');
    expect(flipCoin(() => 0.49)).toBe('top');
    expect(flipCoin(() => 0.5)).toBe('bottom');
    expect(flipCoin(() => 0.99)).toBe('bottom');
  });

  it.each([
    [{ points: { top: 1, bottom: 2 }, priority: 'top' }, true],
    [{ points: { top: 1, bottom: 2 }, priority: null }, true],
    [{ points: { top: 1, bottom: 2 }, priority: 'left' }, false],
    [{ points: { top: 1, bottom: 2 } }, false],
    [{ points: null, priority: null }, false],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 4 }, true],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 0 }, false],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 1.5 }, false],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: '2' }, false],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 2, startedAt: T0 }, true],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 2, startedAt: null }, true],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 2, startedAt: 'x' }, false],
    [{ points: { top: 1, bottom: 2 }, priority: 'top', round: 2, startedAt: -1 }, false],
    ['nope', false],
  ])('validates stored state %j', (input, valid) => {
    expect(parseGameState(input) !== null).toBe(valid);
  });

  it('resumes games saved before the round counter at round 1', () => {
    expect(parseGameState({ points: { top: 1, bottom: 2 }, priority: 'top' })?.round).toBe(1);
  });
});
