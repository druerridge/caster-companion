import {
  INITIAL_MISSION_POINTS,
  MISSION_POINT_GOAL,
  decrement,
  hasReachedGoal,
  increment,
  parseMissionPoints,
} from '@/domain/missionPoints';

describe('mission points', () => {
  it('starts both sides at 0', () => {
    expect(INITIAL_MISSION_POINTS).toEqual({ top: 0, bottom: 0 });
  });

  it('increments only the given side, with no upper limit', () => {
    let points = INITIAL_MISSION_POINTS;
    for (let i = 0; i < 150; i++) points = increment(points, 'top');
    expect(points).toEqual({ top: 150, bottom: 0 });
  });

  it('decrements but never below 0', () => {
    const points = increment(INITIAL_MISSION_POINTS, 'bottom');
    expect(decrement(points, 'bottom')).toEqual({ top: 0, bottom: 0 });
    expect(decrement(INITIAL_MISSION_POINTS, 'bottom')).toBe(INITIAL_MISSION_POINTS);
  });

  it.each([
    [
      { top: 3, bottom: 7 },
      { top: 3, bottom: 7 },
    ],
    [
      { top: 3, bottom: 7, extra: true },
      { top: 3, bottom: 7 },
    ],
    [null, null],
    ['3', null],
    [{ top: -1, bottom: 0 }, null],
    [{ top: 1.5, bottom: 0 }, null],
    [{ top: 1 }, null],
  ])('parses stored value %j as %j', (input, expected) => {
    expect(parseMissionPoints(input)).toEqual(expected);
  });
});

describe('hasReachedGoal', () => {
  it('is reached at 30 and stays reached above it', () => {
    expect(MISSION_POINT_GOAL).toBe(30);
    expect(hasReachedGoal(29)).toBe(false);
    expect(hasReachedGoal(30)).toBe(true);
    expect(hasReachedGoal(45)).toBe(true);
  });
});
