const avatarPalettes = [
  ["#4f46e5", "#a5b4fc"],
  ["#db2777", "#fbcfe8"],
  ["#059669", "#a7f3d0"],
  ["#ea580c", "#fed7aa"],
  ["#0284c7", "#bae6fd"],
] as const;

export function pickAvatarPalette(seed: string): readonly [string, string] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPalettes[hash % avatarPalettes.length]!;
}

export function createAvatarInitials(name?: string | null): string {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}
