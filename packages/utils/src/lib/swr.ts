export class LocalStorageCache<T> {
  public get(key: string): T | undefined {
    const value = localStorage.getItem(key);
    if (value === null) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  public set(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  public delete(key: string): void {
    localStorage.removeItem(key);
  }
  public keys(): IterableIterator<string> {
    return Object.keys(localStorage).values();
  }
}
