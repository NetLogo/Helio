class CachedLocalStorage<T> {
  constructor(
    private key: string,
    private lifetimeMs: number | null = null,
  ) {}

  get(): T | null {
    const item: CachedLocalStorageItem<T> | null = JSON.parse(
      localStorage.getItem(this.key) || "null",
    );
    if (item && this.checkValidity(item)) return item.data;
    return null;
  }

  set(data: T): void {
    const item: CachedLocalStorageItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.key, JSON.stringify(item));
  }

  delete(): void {
    localStorage.removeItem(this.key);
  }

  checkValidity(item: CachedLocalStorageItem<T>): boolean {
    if (this.lifetimeMs === null) return true;
    const isExpired = Date.now() - item.timestamp > this.lifetimeMs;
    return !isExpired;
  }
}

function wrapCacheLocalStorage<T>(
  key: string,
  lifetimeMs: number | null = null,
  fallback: () => Promise<T>,
): () => Promise<T> {
  return async (): Promise<T> => {
    const cache = new CachedLocalStorage<T>(key, lifetimeMs);
    const cachedData = cache.get();
    if (cachedData !== null) {
      return cachedData;
    }
    const data = await fallback();
    setTimeout(() => cache.set(data), 0);
    return data;
  };
}

interface CachedLocalStorageItem<T> {
  data: T;
  timestamp: number;
}

export { CachedLocalStorage, wrapCacheLocalStorage };
export type { CachedLocalStorageItem };
