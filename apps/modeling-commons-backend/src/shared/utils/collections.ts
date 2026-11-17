export function collectUniqueDefined<T>(values: ReadonlyArray<T | null | undefined>): Array<T> {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];
}

export function lookup<K, V>(map: ReadonlyMap<K, V>, key: K | null | undefined): V | null {
  if (key === null || key === undefined) return null;
  return map.get(key) ?? null;
}
