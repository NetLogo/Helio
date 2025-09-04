export interface Mappable<K extends PropertyKey, V> {
  map<U>(fn: (key: K, value: V) => U): Mappable<K, U>;
}

export class ObjectFunctor<T extends Record<PropertyKey, any>>
  implements Mappable<keyof T, T[keyof T]>
{
  constructor(private internal: T) {}

  map<U>(
    fn: (key: keyof T, value: T[keyof T]) => U
  ): ObjectFunctor<{ [P in keyof T]: U }> {
    const result = {} as { [P in keyof T]: U };
    for (const key of Object.keys(this.internal) as (keyof T)[]) {
      result[key] = fn(key, this.internal[key]);
    }
    return new ObjectFunctor(result);
  }

  get(): T {
    return this.internal;
  }
}
