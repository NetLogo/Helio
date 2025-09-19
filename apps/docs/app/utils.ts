import { Env } from '../env';

export function withBasePath(path: string, basePath = Env.basePath): string {
  const isBasePathDefined = typeof basePath === 'string' && basePath.length > 0;
  if (isBasePathDefined && path.startsWith('/')) {
    return `${basePath}${path}`;
  }
  return path;
}
