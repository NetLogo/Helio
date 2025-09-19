export class LocalStorageCache<T> {
  get(key: string): T | undefined {
    const value = localStorage.getItem(key);
    if (!value) return undefined;
    return JSON.parse(value);
  }
  set(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  delete(key: string) {
    localStorage.removeItem(key);
  }
  keys(): IterableIterator<string> {
    return Object.keys(localStorage).values();
  }
}
