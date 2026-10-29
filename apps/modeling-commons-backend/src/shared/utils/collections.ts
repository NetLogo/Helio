export function collectUniqueDefined<T>(values: ReadonlyArray<T | null | undefined>): Array<T> {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];
}
