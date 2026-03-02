type Key = string | number | symbol;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IsObject<T> = T extends object ? (T extends Array<any> ? false : true) : false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericObject = object | Array<any>;
type Merge<T, U> = IsObject<T> & IsObject<U> extends true
  ? {
      [K in keyof T]: K extends keyof U ? Merge<T[K], U[K]> : T[K];
    } & U
  : U;

class ObjectFunctor<T extends Record<PropertyKey, unknown>> {
  public constructor(private readonly internal: T) {}

  public mapValues<U>(
    fn: (key: keyof T, value: T[keyof T]) => U,
  ): ObjectFunctor<{ [P in keyof T]: U }> {
    const result = {} as { [P in keyof T]: U };
    for (const key of Object.keys(this.internal) as Array<keyof T>) {
      result[key] = fn(key, this.internal[key]);
    }
    return new ObjectFunctor(result);
  }

  public mapKeys<NK extends PropertyKey>(
    fn: (key: keyof T, value: T[keyof T]) => NK,
  ): ObjectFunctor<Record<NK, T[keyof T]>> {
    const result = {} as Record<NK, T[keyof T]>;
    for (const key of Object.keys(this.internal) as Array<keyof T>) {
      const newKey = fn(key, this.internal[key]);
      result[newKey] = this.internal[key];
    }
    return new ObjectFunctor(result);
  }

  public map<NK extends PropertyKey, U>(
    fn: (key: keyof T, value: T[keyof T]) => [NK, U],
  ): ObjectFunctor<Record<NK, U>> {
    const result = {} as Record<NK, U>;
    for (const key of Object.keys(this.internal) as Array<keyof T>) {
      const [newKey, newValue] = fn(key, this.internal[key]);
      result[newKey] = newValue;
    }
    return new ObjectFunctor(result);
  }

  public forEach(fn: (key: keyof T, value: T[keyof T]) => void): void {
    for (const key of Object.keys(this.internal) as Array<keyof T>) {
      fn(key, this.internal[key]);
    }
  }

  public get(): T {
    return this.internal;
  }
}

function isRecord<T>(v: T): IsObject<T> {
  return (typeof v === "object" && v !== null && !Array.isArray(v)) as IsObject<T>;
}

function deepMerge<T extends object, U extends object>(
  a: T,
  b: U,
  { mergeArrays = true }: { mergeArrays?: boolean } = {},
): Merge<T, U> {
  return (
    isRecord(a) && isRecord(b)
      ? Object.assign(
          {},
          a,
          Object.fromEntries(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            Object.entries(b).map(([k, v]) => [k, deepMerge((a as any)[k], v, { mergeArrays })]),
          ),
        )
      : Array.isArray(a) && Array.isArray(b)
        ? mergeArrays
          ? [...a, ...b]
          : b
        : b
  ) as Merge<T, U>;
}

export { deepMerge, isRecord, ObjectFunctor };
export type { GenericObject, Key };
