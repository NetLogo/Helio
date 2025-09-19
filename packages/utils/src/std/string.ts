export function camelCaseToKebabCase(s0: string): string {
  return s0
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}
