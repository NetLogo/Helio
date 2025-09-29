import type { RecursivePartial } from 'types/record';

/**
 * Creates a proxy object that returns default values for missing properties.
 * Supports nested objects and ensures immutability.
 *
 * @param _defaultValue - An object containing default values for properties.
 * @returns A function that takes an object and returns a proxy with defaults applied.
 *
 * @example
 * const defaultSettings = { theme: 'light', layout: { sidebar: true, header: false } };
 * const applyDefaults = createDefault(defaultSettings);
 * const userSettings = { layout: { header: true } };
 * const settings = applyDefaults(userSettings);
 *
 */
export function createDefault<T>(_defaultValue: T): (_object?: RecursivePartial<T>) => Readonly<T> {
  const $trapped = Symbol('__is_trapped__');
  return (_object: RecursivePartial<T> | undefined): Readonly<T> => {
    return new Proxy(_object ?? ({} as RecursivePartial<T>), {
      get: (obj: RecursivePartial<T>, _prop: string | symbol): T[keyof T] => {
        if (_prop === $trapped) return true as unknown as T[keyof T];
        const prop = _prop as keyof T;
        const val = obj[prop];
        if ($trapped in obj) return val as T[keyof T];
        if (val !== undefined) {
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const defaultValue: T[keyof T] = _defaultValue[prop] ?? ({} as T[keyof T]);
            const defaultProxy = createDefault(defaultValue);
            return defaultProxy(val as RecursivePartial<T[keyof T]>) as T[keyof T];
          }
          return val as T[keyof T];
        }
        return _defaultValue[prop];
      },

      ownKeys: () => Reflect.ownKeys(_defaultValue as object),
      getOwnPropertyDescriptor: () => {
        return {
          enumerable: true,
          configurable: true,
          writable: false,
        };
      },
    }) as Required<T>;
  };
}
