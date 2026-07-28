import rules from '#src/config/rules.ts';

export function truncatePreview(
  text: string,
  max = rules.limits.notification.previewLength,
): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
