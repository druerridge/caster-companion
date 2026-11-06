import { NEW_GAME, flipCoin, gameReducer, otherSide, parseGameState } from '@/domain/game';

describe('game reducer', () => {
  it('starts with no priority and zero points', () => {
    expect(NEW_GAME).toEqual({ points: { top: 0, bottom: 0 }, priority: null });
  });

  it('starts with the chosen player first', () => {
    expect(gameReducer(NEW_GAME, { type: 'start', first: 'top' }).priority).toBe('top');
  });

  it('passes priority back and forth', () => {
    let state = gameReducer(NEW_GAME, { type: 'start', first: 'bottom' });
    state = gameReducer(state, { type: 'passPriority' });
    expect(state.priority).toBe('top');
    state = gameReducer(state, { type: 'passPriority' });
    expect(state.priority).toBe('bottom');
  });

  it('ignores passing priority before the game has started', () => {
    expect(gameReducer(NEW_GAME, { type: 'passPriority' })).toBe(NEW_GAME);
  });

  it('scores without touching priority', () => {
    const started = gameReducer(NEW_GAME, { type: 'start', first: 'top' });
    const scored = gameReducer(started, { type: 'increment', side: 'bottom' });
    expect(scored).toEqual({ points: { top: 0, bottom: 1 }, priority: 'top' });
    expect(gameReducer(started, { type: 'decrement', side: 'top' })).toBe(started);
  });

  it('reset clears points and priority', () => {
    let state = gameReducer(NEW_GAME, { type: 'start', first: 'top' });
    state = gameReducer(state, { type: 'increment', side: 'top' });
    expect(gameReducer(state, { type: 'reset' })).toEqual(NEW_GAME);
  });

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
    ['nope', false],
  ])('validates stored state %j', (input, valid) => {
    expect(parseGameState(input) !== null).toBe(valid);
  });
});
