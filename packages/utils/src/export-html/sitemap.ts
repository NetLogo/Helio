import fs from 'fs';
import path from 'path';

class UrlTag {
  private readonly loc: string;

  public constructor(loc: string) {
    this.loc = loc;
  }

  public toString(): string {
    return [' <url>', `  <loc>${this.loc}</loc>`, ' </url>'].join('\n');
  }
}

export function generateSitemap(
  scanDir: string,
  baseUrl: string,
  extensions: Array<string> = ['.html']
): string {
  const urls: Array<UrlTag> = [];
  const files = fs.readdirSync(scanDir, { recursive: true, encoding: 'utf-8' });
  files.forEach((file) => {
    if (extensions.includes(path.extname(file))) {
      const url = new URL(file, baseUrl).toString();
      urls.push(new UrlTag(url));
    }
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => url.toString()),
    '</urlset>',
  ].join('\n');
}
