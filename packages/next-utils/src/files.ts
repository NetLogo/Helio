import fs from 'fs';
import path from 'path';

export function saveToPublicDir(filePath: Array<string>, content: string) {
  const publicDir = path.join(process.cwd(), 'public');
  const fullPath = path.join(publicDir, ...filePath);
  const dir = path.dirname(fullPath);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}
