type Key = string | number | symbol;
type GenericObject<A> = Record<Key, A>;

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

function isRecord(value: unknown): value is GenericObject<unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<A, B>(a: GenericObject<A>, b: GenericObject<B>): GenericObject<A | B> {
  const result: GenericObject<A | B> = { ...a };

  for (const [key, value] of Object.entries(b)) {
    if (isRecord(result[key]) && isRecord(value)) {
      result[key] = deepMerge(result[key], value) as A | B;
    } else if (Array.isArray(result[key]) && Array.isArray(value)) {
      result[key] = [...result[key], ...value] as A | B;
    } else {
      result[key] = value;
    }
  }

  return result;
}

export { deepMerge, isRecord, ObjectFunctor };
export type { GenericObject, Key };
