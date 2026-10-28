import rules from '#src/config/rules.ts';

export function truncatePreview(
  text: string,
  max = rules.limits.notification.previewLength,
): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function formatOthers(count: number): string {
  return `${count} ${count === 1 ? 'other' : 'others'}`;
}

export function formatUserList(names: ReadonlyArray<string>, total: number): string {
  const [first, second] = names;
  if (first === undefined) return total === 1 ? 'One person' : `${total} people`;

  if (second === undefined) {
    return total > 1 ? `${first} and ${formatOthers(total - 1)}` : first;
  }

  return total > 2
    ? `${first}, ${second}, and ${formatOthers(total - 2)}`
    : `${first} and ${second}`;
}
