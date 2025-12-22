import Path from "crosspath";
import Fs from "fs";

export function copyFile(src: string, trg: string): void {
  createFolder(Path.dirname(trg));
  Fs.copyFileSync(src, trg);
}

export function removeFile(src: string): void {
  Fs.rmSync(src);
}

export function createFolder(path: string): void {
  Fs.mkdirSync(path, { recursive: true });
}

export function removeFolder(path: string): void {
  const isDownstream = path.startsWith(Path.resolve());
  if (isDownstream) {
    Fs.rmSync(path, { recursive: true, force: true });
  }
}

export function removeEntry(path: string): void {
  if (Fs.existsSync(path)) {
    if (isFile(path)) {
      removeFile(path);
    } else {
      removeFolder(path);
    }
  }
}

export function isFile(path: string): boolean {
  return Fs.lstatSync(path).isFile();
}
