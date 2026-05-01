const SAFE_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

export function sanitizeUrl(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Allow relative URLs (no protocol, no protocol-relative //)
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    return SAFE_PROTOCOLS.includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function sanitizeNavigationQuery(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Only allow relative paths (no protocol, no protocol-relative //)
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    return "";
  }

  // Ensure it starts with a slash for consistency
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
