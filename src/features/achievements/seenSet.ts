import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'achievements.seen.v1';

export function filterUnseen(ids: string[], seen: Set<string>): string[] {
  return ids.filter((id) => !seen.has(id));
}
export async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
export async function markSeen(seen: Set<string>, ids: string[]): Promise<Set<string>> {
  const next = new Set(seen);
  ids.forEach((id) => next.add(id));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* best-effort */
  }
  return next;
}
