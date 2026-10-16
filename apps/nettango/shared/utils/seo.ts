export const DESCRIPTION_LIMIT = 160;

export const clampDescription = (text: string, limit = DESCRIPTION_LIMIT): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, "")}…`;
};

export const robotsText = (sitemapUrl: string): string =>
  ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemapUrl}`, ""].join("\n");
