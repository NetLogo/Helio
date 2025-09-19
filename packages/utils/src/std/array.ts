export function dropWhile<T>(array: Array<T>, predicate: (item: T) => boolean): Array<T> {
  const index = array.findIndex((item) => !predicate(item));
  return index === -1 ? [] : array.slice(index);
}

export function takeWhile<T>(array: Array<T>, predicate: (item: T) => boolean): Array<T> {
  const index = array.findIndex((item) => !predicate(item));
  return index === -1 ? array : array.slice(0, index);
}

export function groupBy<T, K extends keyof unknown>(
  array: Array<T>,
  keyFn: (item: T) => K
): Record<K, Array<T>> {
  return array.reduce<Record<K, Array<T>>>((acc, item) => {
    const key = keyFn(item);
    if (!Array.isArray(acc[key])) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

export function mapBy<T, K>(array: Array<T>, keyFn: (item: T) => K): Map<K, T> {
  return array.reduce((acc, item) => {
    acc.set(keyFn(item), item);
    return acc;
  }, new Map<K, T>());
}

export function zip<T, U>(
  array1: Array<T>,
  array2: Array<U>
): Array<[T | undefined, U | undefined]> {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return [];
  }
  const length = Math.max(array1.length, array2.length);
  return Array(length)
    .fill(0)
    .map((_, i) => [array1[i], array2[i]]);
}
