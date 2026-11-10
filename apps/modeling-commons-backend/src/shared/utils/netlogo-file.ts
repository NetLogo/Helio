import { isValidNetlogoFilename } from '#src/shared/utils/netlogo.ts';

export type NlogoMetadata = {
  netlogoVersion: string | null;
  infoTab: string | null;
};

const NLOGO_SECTION_SEPARATOR = '@#$#@#$#@';
const NLOGOX_MODEL_TAG_MAX_CHARS = 4096;

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
  const infoTab = (parts[2] ?? '').trim() || null;
  const versionRaw = (parts[4] ?? '').trim() || null;
  const netlogoVersion =
    versionRaw && versionRaw.length < 100 ? stripNetlogoVersionPrefix(versionRaw) : null;
  return { netlogoVersion, infoTab };
}

export function parseNlogox(contents: string): NlogoMetadata {
  const netlogoVersion = parseNlogoxVersion(contents);

  const infoRaw = /<info\b[^>]*>([\s\S]*?)<\/info>/.exec(contents)?.[1] ?? null;
  const infoTab = infoRaw ? decodeXmlText(infoRaw).trim() || null : null;

  return { netlogoVersion, infoTab };
}

function parseNlogoxVersion(contents: string): string | null {
  const versionRaw = findModelTagVersion(contents);
  return versionRaw ? stripNetlogoVersionPrefix(versionRaw) : null;
}

function stripNetlogoVersionPrefix(versionRaw: string): string | null {
  return versionRaw.trim().replace(/^NetLogo\s*(3D)?\s*/i, '') || null;
}

function findModelTagVersion(contents: string): string | null {
  const modelTagStart = /<model\b/g;
  for (let match = modelTagStart.exec(contents); match; match = modelTagStart.exec(contents)) {
    const window = contents.slice(match.index, match.index + NLOGOX_MODEL_TAG_MAX_CHARS);
    const tagEnd = window.indexOf('>');
    const tag = tagEnd < 0 ? window : window.slice(0, tagEnd);
    const version = /\sversion="([^"]*)"/.exec(tag)?.[1];
    if (version !== undefined) return version;
    if (tagEnd < 0) return null;
    modelTagStart.lastIndex = match.index + tagEnd + 1;
  }
  return null;
}

export function parseNetlogoContents(contents: string, format: string): NlogoMetadata {
  return format.startsWith('nlogox') ? parseNlogox(contents) : parseNlogo(contents);
}

// The info tab is skipped because decoding it can throw on an out-of-range
// numeric entity, and an upload must never fail on its NetLogo version.
export function detectNetlogoVersion(file: { buffer: Buffer; filename: string }): string | null {
  if (!isValidNetlogoFilename(file.filename)) return null;
  const contents = file.buffer.toString('utf8');
  const format = getNlogoFileExtension(contents);
  return format.startsWith('nlogox')
    ? parseNlogoxVersion(contents)
    : parseNlogo(contents).netlogoVersion;
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
