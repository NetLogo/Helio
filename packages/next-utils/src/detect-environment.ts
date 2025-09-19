export function isNextEnvironment(): boolean {
  let isNext: boolean = false;
  try {
    // Why `next/image` and not `next` or `next/router`?
    // There is no explicit reason beyond require('next') failing
    // even in a Next.js environment for me when testing locally.
    // Maybe it's because next/image is more core to Next.js?
    // - Omar I. Sep 2025
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('next/image');
    isNext = true;
  } catch {
    isNext = false;
  }
  return isNext;
}
