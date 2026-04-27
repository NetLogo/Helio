# Vitest

## Description

Modern JavaScript/TypeScript testing with Vitest including mocking and coverage. This is our primary test-runner. We
empower Vitest with tools like `@nuxt/test-utils` and `@vue/test-utils` for Vue component testing, and Playwright Core for end-to-end testing.

## When to Use

- Testing JavaScript/TypeScript
- Vue component testing
- Unit and integration tests
- Fast feedback during development
- Mocking dependencies
- Code coverage analysis
- End-to-end testing with Playwright Core

---

## Core Patterns

### Basic Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('math', () => {
  it('should add numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('should throw on invalid input', () => {
    expect(() => divide(1, 0)).toThrow('Division by zero');
  });
});
```

### Mocking

```typescript
import { vi, describe, it, expect } from 'vitest';

// Mock module
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1 })
}));

// Mock function
const callback = vi.fn();
callback('arg');
expect(callback).toHaveBeenCalledWith('arg');
```

### Async Tests

```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toEqual({ id: 1 });
});

it('should reject on error', async () => {
  await expect(fetchData()).rejects.toThrow('Error');
});
```

## Best Practices

1. Use describe blocks for grouping
2. Prefer async/await for async tests
3. Use userEvent over fireEvent
4. Mock at module boundaries
5. Clean up after tests

## Common Pitfalls

- **Not awaiting async**: Always await promises
- **Stale mocks**: Clear mocks between tests
- **Testing implementation**: Test behavior

## Docs links
- [CLI](https://vitest.dev/guide/cli)
- [Test Filtering](https://vitest.dev/guide/filtering)
- [Test Context](https://vitest.dev/guide/test-context)
- [Test Environment](https://vitest.dev/guide/environment)
- [Snapshot](https://vitest.dev/guide/snapshot)
- [Mocking](https://vitest.dev/guide/mocking)
  - [Dates](https://vitest.dev/guide/mocking/dates)
  - [Functions](https://vitest.dev/guide/mocking/functions)
  - [Modules](https://vitest.dev/guide/mocking/modules)
  - [Requests](https://vitest.dev/guide/mocking/requests)
  - [Timers](https://vitest.dev/guide/mocking/timers)
- [Test Projects](https://vitest.dev/guide/projects)
- [Coverage](https://vitest.dev/guide/coverage)
- [Vitest UI](https://vitest.dev/guide/ui)
- [IDE Integration](https://vitest.dev/guide/ide)
- [Debugging](https://vitest.dev/guide/debugging)
- [Common Errors](https://vitest.dev/guide/common-errors)
