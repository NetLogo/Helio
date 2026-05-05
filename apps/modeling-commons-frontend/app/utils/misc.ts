export function asRecord<K extends PropertyKey, V>(arg: unknown): Record<K, V> {
  return (arg ?? {}) as Record<K, V>;
}
