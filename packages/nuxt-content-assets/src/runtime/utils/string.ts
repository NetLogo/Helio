/**
 * Get matched tokens (words, expressions) from a string or an array of possible strings
 *
 * Tokens may be separated by space, comma or pipe
 */
export function matchTokens(
  value: string | Array<string> | Record<string, unknown> | boolean | undefined,
): Array<string> {
  let tokens: Array<string> = [];
  if (typeof value === "string") {
    tokens = value.match(/[^\s,|]+/g) || [];
  } else if (Array.isArray(value)) {
    tokens = value
      .filter((val) => typeof val === "string")
      .reduce((output: Array<string>, input) => {
        return [...output, ...matchTokens(input)];
      }, []);
  } else if (!!value && typeof value === "object") {
    tokens = Object.values(value).reduce((output: Array<string>, value) => {
      return [...output, ...matchTokens(value)];
    }, []);
  }
  return tokens.length ? Array.from(new Set(tokens)) : tokens;
}

export function toPath(key: string): string {
  return key.replaceAll(":", "/");
}

export function toKey(path: string): string {
  return path.replaceAll("/", ":");
}

export function deKey(path: string): string {
  return path.replace(/^[^:]+:/, "");
}
