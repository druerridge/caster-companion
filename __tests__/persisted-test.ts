import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseMissionPoints } from '@/domain/missionPoints';
import { load, save } from '@/storage/persisted';

const KEY = { key: 'test.points', parse: parseMissionPoints };

describe('persisted storage', () => {
  beforeEach(() => AsyncStorage.clear());

  it('round-trips a value', async () => {
    await save(KEY, { top: 2, bottom: 5 });
    expect(await load(KEY)).toEqual({ top: 2, bottom: 5 });
  });

  it('returns null when nothing is stored', async () => {
    expect(await load(KEY)).toBeNull();
  });

  it('returns null for corrupt JSON or invalid shapes', async () => {
    await AsyncStorage.setItem(KEY.key, '{not json');
    expect(await load(KEY)).toBeNull();
    await AsyncStorage.setItem(KEY.key, JSON.stringify({ top: 'x' }));
    expect(await load(KEY)).toBeNull();
  });
});
