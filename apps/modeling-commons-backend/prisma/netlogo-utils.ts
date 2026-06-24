function parseNlogo(contents: string): {
  netlogoVersion: string | null;
  infoTab: string | null;
} {
  const SEP = '@#$#@#$#@';
  const parts = contents.split(SEP);
  if (parts.length < 5) return { netlogoVersion: null, infoTab: null };
  const infoTab = parts[2]?.trim() || null;
  const versionRaw = parts[4]?.trim() || null;
  const netlogoVersion = versionRaw && versionRaw.length < 100 ? versionRaw : null;
  return { netlogoVersion, infoTab };
}

function parseNlogox(contents: string): {
  netlogoVersion: string | null;
  infoTab: string | null;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contents, 'application/xml');
    const modelEl = doc.querySelector('model');
    if (!modelEl) return { netlogoVersion: null, infoTab: null };
    const versionRaw = modelEl.getAttribute('version') ?? null;
    const netlogoVersion = versionRaw
      ? versionRaw.trim().replace(/^NetLogo\s*(3D)?\s*/i, '')
      : null;
    const infoTabEl = doc.querySelector('info');
    const infoTab = infoTabEl ? infoTabEl.textContent?.trim() || null : null;
    return { netlogoVersion, infoTab };
  } catch {
    return { netlogoVersion: null, infoTab: null };
  }
}

function getNlogoFileExtension(contents: string): string {
  if (contents.includes('@#$#@#$#@')) return 'nlogo';
  if (contents.includes('<model version="NetLogo 3D')) return 'nlogox3d';
  if (contents.includes('<?xml')) return 'nlogox';
  if (contents.includes('setxyz')) return 'nlogo3d';
  return 'unknown';
}

export { getNlogoFileExtension, parseNlogo, parseNlogox };
