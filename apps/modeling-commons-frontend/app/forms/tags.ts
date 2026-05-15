export const normalizeTagName = (name: string): string => name.trim().toLowerCase();
export function areTagsEqual(
  anchor: { name: string; displayName?: string },
  other: { name: string; displayName?: string },
): boolean {
  anchor.name = normalizeTagName(anchor.name);
  other.name = normalizeTagName(other.name);

  if (other.displayName && anchor.name === other.displayName) return true;
  if (anchor.displayName && other.name === anchor.displayName) return true;

  if (anchor.name !== other.name) return false;
  if (other.displayName && anchor.displayName !== other.displayName) return false;

  return true;
}

export function breakdownTagName({ name, displayName }: { name: string; displayName?: string }): {
  name: string;
  displayName: string;
  protocol?: string;
} {
  const anchor = displayName ?? name;
  const validProtocols = ["usecase", "subject", "kind", "field", "platform", "category"];
  const re = new RegExp(`^(${validProtocols.join("|")}):`, "i");
  const matches = anchor.match(re);
  if (matches) {
    const protocol = matches[1]!.toLowerCase();
    const rest = anchor.substring(matches[0]!.length);
    return { name, displayName: displayName ? rest : `${sentenceCase(rest)}`, protocol };
  } else if (displayName) {
    return { name, displayName, protocol: undefined };
  } else {
    return { name, displayName: sentenceCase(name), protocol: undefined };
  }
}

export function formatTagName({
  name,
  displayName,
}: {
  name: string;
  displayName?: string;
}): string {
  return breakdownTagName({ name, displayName }).displayName;
}
