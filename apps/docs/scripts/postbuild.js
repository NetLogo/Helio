import fs from 'fs';
import path from 'path';

import { generateSitemap } from '@repo/utils/export-html/sitemap';
import { defined } from '@repo/utils/std/null';

// eslint-disable-next-line no-undef
if (!defined(process)) {
  throw new Error('This script must be run in a Node.js environment');
}

// eslint-disable-next-line no-undef
const outDir = process.env['OUTDIR'] ?? 'out';
const baseUrl = [
  // eslint-disable-next-line no-undef
  process.env['PRODUCT_WEBSITE'] ?? 'https://docs.netlogo.org',
  // eslint-disable-next-line no-undef
  process.env['BASE_PATH'] ?? '',
].join('');

const sitemap = generateSitemap(outDir, baseUrl);
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');
