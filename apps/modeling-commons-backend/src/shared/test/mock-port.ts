import { vi, type Mock } from 'vitest';

export type MockedPort<T> = { [K in keyof T]-?: Mock };

export function mockPort<T>(overrides: Partial<MockedPort<T>> = {}): MockedPort<T> {
  const fns: Record<string, Mock> = { ...(overrides as Record<string, Mock>) };
  return new Proxy(fns, {
    get(target, prop) {
      // Without this a mock returned from an async function would be treated as a thenable.
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      target[prop] ??= vi.fn();
      return target[prop];
    },
  }) as MockedPort<T>;
}
