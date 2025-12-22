class CachedLocalStorage<T> {
  public constructor(
    private readonly key: string,
    private readonly lifetimeMs: number | null = null,
  ) {}

  public get(): T | null {
    const item: CachedLocalStorageItem<T> | null = JSON.parse(
      localStorage.getItem(this.key) ?? "null",
    ) as CachedLocalStorageItem<T> | null;
    if (item && this.checkValidity(item)) return item.data;
    return null;
  }

  public set(data: T): void {
    const item: CachedLocalStorageItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.key, JSON.stringify(item));
  }

  public delete(): void {
    localStorage.removeItem(this.key);
  }

  public checkValidity(item: CachedLocalStorageItem<T>): boolean {
    if (this.lifetimeMs === null) return true;
    const isExpired = Date.now() - item.timestamp > this.lifetimeMs;
    return !isExpired;
  }
}

function wrapCacheLocalStorage<T>(
  key: string,
  lifetimeMs: number | null = null,
  fallback: () => Promise<T> = async () => {
    throw new Error("No fallback function provided");
  },
): () => Promise<T> {
  return async (): Promise<T> => {
    const cache = new CachedLocalStorage<T>(key, lifetimeMs);
    const cachedData = cache.get();
    if (cachedData !== null) {
      return cachedData;
    }
    const data = await fallback();
    setTimeout(() => {
      cache.set(data);
    }, 0);
    return data;
  };
}

type CachedLocalStorageItem<T> = {
  data: T;
  timestamp: number;
};

export { CachedLocalStorage, wrapCacheLocalStorage };
export type { CachedLocalStorageItem };
