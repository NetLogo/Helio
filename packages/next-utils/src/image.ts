import { isNextEnvironment } from 'detect-environment';
import fs from 'fs';
import sizeOf from 'image-size';
import path from 'path';
import sharp from 'sharp';

export type BufferOrString = Buffer | string;
export async function getImageBuffer(
  src: BufferOrString,
  root: Array<string> = [process.cwd(), 'public']
): Promise<Buffer | null> {
  if (src instanceof Buffer) return src;

  if (typeof src !== 'string') return null;

  if (!isNextEnvironment() && typeof window !== 'undefined') {
    console.warn(
      'getImageBuffer should only be called in a Node.js environment, such as during server-side rendering.'
    );
    return null;
  }

  if (['../', './', '/'].every((prefix) => !src.startsWith(prefix))) {
    console.warn(`getImageBuffer only supports image paths relative to root (${root}).`);
    return null;
  }
  const osSrc = decodeURIComponent(src.replace(/^\//, '').split('?')[0] ?? '').split('/');
  if (osSrc.length === 0) return null;

  const publicPath = path.join(...root, ...osSrc);

  if (!fs.existsSync(publicPath)) {
    console.warn(`Image not found at path: ${publicPath}`);
    return null;
  }

  return fs.promises.readFile(publicPath);
}

export async function getImageDimensions(src: BufferOrString): Promise<{
  width: number | undefined;
  height: number | undefined;
}> {
  const imageBuffer = await getImageBuffer(src);
  if (!imageBuffer) return { width: undefined, height: undefined };

  const dimensions = sizeOf(imageBuffer);
  return { width: dimensions.width, height: dimensions.height };
}

export async function getBlurredPlaceholder(src: BufferOrString): Promise<string | null> {
  const imageBuffer = await getImageBuffer(src);
  if (!imageBuffer) return null;

  const sharpImage = sharp(imageBuffer);
  const placeholder = await sharpImage.resize(10).toBuffer();
  const base64 = placeholder.toString('base64');
  const blurDataURL = `data:image/png;base64,${base64}`;
  return blurDataURL;
}
