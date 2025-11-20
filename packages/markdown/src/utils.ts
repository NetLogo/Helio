// Dupe because of a dependency resolution issue I am struggling
// to fix. Essentially, the module resolution fails to find anything
// in @repo/utils. -Omar I Nov 20 2025
export function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}
