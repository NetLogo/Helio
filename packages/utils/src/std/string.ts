export function camelCaseToKebabCase(s0: string): string {
  return s0
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}

export function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EnglishPreservedKeywords = [
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "at",
  "around",
  "by",
  "after",
  "along",
  "from",
  "of",
  "on",
  "to",
  "with",
];

export function toSentenceCase(
  s: string,
  { preservedKeywords }: { preservedKeywords?: Array<string> } = {},
): string {
  if (s.length === 0) return s;
  return s
    .split(" ")
    .map((word) => {
      if (Boolean(preservedKeywords?.includes(word))) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
