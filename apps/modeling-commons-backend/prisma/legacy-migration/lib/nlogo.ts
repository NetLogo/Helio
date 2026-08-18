export type NlogoMetadata = {
  netlogoVersion: string | null;
  infoTab: string | null;
};

const NLOGO_SECTION_SEPARATOR = '@#$#@#$#@';

export function getNlogoFileExtension(contents: string): string {
  if (contents.includes(NLOGO_SECTION_SEPARATOR)) return 'nlogo';
  if (contents.includes('<model version="NetLogo 3D')) return 'nlogox3d';
  if (contents.includes('<?xml')) return 'nlogox';
  if (contents.includes('setxyz')) return 'nlogo3d';
  return 'unknown';
}

/**
 * Sections, in order: code, interface, info, turtle shapes, version, preview
 * commands, system dynamics, behavior space, hub net client, link shapes,
 * model settings, delta tick.
 */
export function parseNlogo(contents: string): NlogoMetadata {
  const parts = contents.split(NLOGO_SECTION_SEPARATOR);
  if (parts.length < 5) return { netlogoVersion: null, infoTab: null };
  const infoTab = parts[2]?.trim() || null;
  const versionRaw = parts[4]?.trim() || null;
  const netlogoVersion = versionRaw && versionRaw.length < 100 ? versionRaw : null;
  return { netlogoVersion, infoTab };
}

export function parseNlogox(contents: string): NlogoMetadata {
  const versionRaw = /<model\b[^>]*?\sversion="([^"]*)"/.exec(contents)?.[1] ?? null;
  const netlogoVersion = versionRaw
    ? versionRaw.trim().replace(/^NetLogo\s*(3D)?\s*/i, '') || null
    : null;

  const infoRaw = /<info\b[^>]*>([\s\S]*?)<\/info>/.exec(contents)?.[1] ?? null;
  const infoTab = infoRaw ? decodeXmlText(infoRaw).trim() || null : null;

  return { netlogoVersion, infoTab };
}

export function parseNetlogoContents(contents: string, format: string): NlogoMetadata {
  return format.startsWith('nlogox') ? parseNlogox(contents) : parseNlogo(contents);
}

function decodeXmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return (cdata?.[1] ?? raw)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}
