export class ObjectFunctor<T extends Record<PropertyKey, any>> {
  constructor(private internal: T) {}

  mapValues<U>(
    fn: (key: keyof T, value: T[keyof T]) => U
  ): ObjectFunctor<{ [P in keyof T]: U }> {
    const result = {} as { [P in keyof T]: U };
    for (const key of Object.keys(this.internal) as (keyof T)[]) {
      result[key] = fn(key, this.internal[key]);
    }
    return new ObjectFunctor(result);
  }

  mapKeys<NK extends PropertyKey>(
    fn: (key: keyof T, value: T[keyof T]) => NK
  ): ObjectFunctor<{ [P in NK]: T[keyof T] }> {
    const result = {} as { [P in NK]: T[keyof T] };
    for (const key of Object.keys(this.internal) as (keyof T)[]) {
      const newKey = fn(key, this.internal[key]);
      result[newKey] = this.internal[key];
    }
    return new ObjectFunctor(result);
  }

  map<NK extends PropertyKey, U>(
    fn: (key: keyof T, value: T[keyof T]) => [NK, U]
  ): ObjectFunctor<{ [P in NK]: U }> {
    const result = {} as { [P in NK]: U };
    for (const key of Object.keys(this.internal) as (keyof T)[]) {
      const [newKey, newValue] = fn(key, this.internal[key]);
      result[newKey] = newValue;
    }
    return new ObjectFunctor(result);
  }

  forEach(fn: (key: keyof T, value: T[keyof T]) => void): void {
    for (const key of Object.keys(this.internal) as (keyof T)[]) {
      fn(key as keyof T, this.internal[key]);
    }
  }

  get(): T {
    return this.internal;
  }
}
