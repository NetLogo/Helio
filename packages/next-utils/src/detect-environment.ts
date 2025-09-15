export function isNextEnvironment() {
  let isNext: boolean;
  try {
    // Why `next/image` and not `next` or `next/router`?
    // There is no explicit reason beyond require('next') failing
    // even in a Next.js environment for me when testing locally.
    // Maybe it's because next/image is more core to Next.js?
    // - Omar I. Sep 2025
    require('next/image');
    isNext = true;
  } catch (error) {
    isNext = false;
  }
  return isNext;
}
