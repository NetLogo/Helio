const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const avatarPalettes = [
  ["#4f46e5", "#a5b4fc"],
  ["#db2777", "#fbcfe8"],
  ["#059669", "#a7f3d0"],
  ["#ea580c", "#fed7aa"],
  ["#0284c7", "#bae6fd"],
] as const;

function pickAvatarPalette(seed: string): readonly [string, string] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPalettes[hash % avatarPalettes.length]!;
}

export default defineCachedEventHandler(
  (event) => {
    const query = getQuery(event);
    const seed = String(query.seed ?? "");
    const initials = escapeXml(String(query.initials ?? "").slice(0, 3));
    const label = escapeXml(String(query.label ?? "Default avatar"));
    const [from, to] = pickAvatarPalette(seed);

    const content = initials
      ? `<text x="128" y="128" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="104" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">${initials}</text>`
      : `<g fill="#fff" fill-opacity="0.85"><circle cx="128" cy="96" r="50"/><ellipse cx="128" cy="240" rx="90" ry="80"/></g>`;

    setResponseHeader(event, "Content-Type", "image/svg+xml; charset=utf-8");

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  ${content}
</svg>`;
  },
  {
    maxAge: 60 * 60 * 24 * 30,
    getKey: (event) => {
      const { seed = "", initials = "", label = "" } = getQuery(event);
      return `${seed}:${initials}:${label}`;
    },
  },
);
