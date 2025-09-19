export function defined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function truthy(value: unknown): boolean {
  return Boolean(value);
}
