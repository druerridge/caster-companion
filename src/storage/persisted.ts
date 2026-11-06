import AsyncStorage from '@react-native-async-storage/async-storage';

// Small typed wrapper over AsyncStorage. Values are JSON; every read goes
// through a parser so corrupt or outdated data falls back to defaults.

export interface PersistedKey<T> {
  key: string;
  parse: (value: unknown) => T | null;
}

export async function load<T>({ key, parse }: PersistedKey<T>): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function save<T>({ key }: PersistedKey<T>, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the in-memory state is still correct.
  }
}
