export class ArrayUtils {
  static dropWhile<T>(array: T[], predicate: (item: T) => boolean): T[] {
    const index = array.findIndex((item) => !predicate(item));
    return index === -1 ? [] : array.slice(index);
  }

  static takeWhile<T>(array: T[], predicate: (item: T) => boolean): T[] {
    const index = array.findIndex((item) => !predicate(item));
    return index === -1 ? array : array.slice(0, index);
  }

  static groupBy<T, K extends keyof any>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    return array.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key]!.push(item);
        return acc;
      },
      {} as Record<K, T[]>
    );
  }

  static mapBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T> {
    return array.reduce((acc, item) => {
      acc.set(keyFn(item), item);
      return acc;
    }, new Map<K, T>());
  }
}
