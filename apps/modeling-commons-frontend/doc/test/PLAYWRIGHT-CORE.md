# Playwright Core

## Description

Browser automation library used for end-to-end testing. We use `playwright-core` (not the full `playwright` package or `@playwright/test` runner) as a library driven from inside Vitest tests, typically via `@nuxt/test-utils`'s `createPage` helper which wraps it. This gives us a single test runner (Vitest) for unit, integration, and E2E.

## When to Use

- End-to-end testing of Nuxt pages and flows
- Driving a real browser from a Vitest test
- Asserting on rendered DOM, network requests, or navigation
- Testing user interactions (clicks, typing, form submission)
- Visual or screenshot-based assertions

Do NOT use for component-level tests — use `@vue/test-utils` with `@nuxt/test-utils`'s `mountSuspended` instead.

---

## Core Patterns

### Basic E2E Test (via @nuxt/test-utils)

```typescript
import { describe, it, expect } from 'vitest';
import { setup, createPage, url } from '@nuxt/test-utils/e2e';

describe('home page', async () => {
  await setup({ server: true, browser: true });

  it('renders the heading', async () => {
    const page = await createPage('/');
    expect(await page.locator('h1').textContent()).toContain('Welcome');
  });
});
```

### Locators & Interactions

```typescript
const page = await createPage('/login');

// Prefer role/label/text-based locators over CSS selectors
await page.getByLabel('Email').fill('user@example.com');
await page.getByLabel('Password').fill('hunter2');
await page.getByRole('button', { name: 'Sign in' }).click();

await page.waitForURL('**/dashboard');
expect(page.url()).toContain('/dashboard');
```

### Auto-Waiting Assertions

Playwright locators auto-wait. Don't add manual sleeps.

```typescript
// Good: retries until visible or times out
await expect.poll(() => page.locator('.toast').isVisible()).toBe(true);

// Or directly:
await page.locator('.toast').waitFor({ state: 'visible' });
expect(await page.locator('.toast').textContent()).toBe('Saved');
```

### Network Interception

```typescript
await page.route('**/api/users', (route) =>
  route.fulfill({ json: [{ id: 1, name: 'Alice' }] })
);

await page.goto('/users');
expect(await page.locator('[data-testid=user]').count()).toBe(1);
```

### Direct playwright-core Usage (without nuxt-test-utils)

```typescript
import { chromium, type Browser } from 'playwright-core';

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); });
afterAll(async () => { await browser.close(); });

it('loads page', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000');
  expect(await page.title()).toBe('Nuxt App');
  await ctx.close();
});
```

## Best Practices

1. Use `@nuxt/test-utils`'s `setup({ browser: true })` — handles server lifecycle and browser launch
2. Prefer `getByRole`, `getByLabel`, `getByText` over CSS/XPath selectors
3. Use `data-testid` only when semantic locators don't fit
4. Let Playwright auto-wait — never `setTimeout` or arbitrary `waitForTimeout`
5. Isolate tests with fresh contexts (`browser.newContext()`) — cookies/storage don't leak
6. `playwright-core` requires you to provide your own browser binaries; CI must install them via `npx playwright install chromium`

## Common Pitfalls

- **Using `playwright-core` expecting browsers bundled**: it isn't `playwright` — install browsers separately
- **No test runner from `@playwright/test`**: no `test.describe`, no fixtures, no `expect(locator).toHaveText()` web assertions — use Vitest's `expect` against awaited locator values, or `expect.poll` for retries
- **Forgetting to close contexts/pages**: leaks memory across tests; use `afterEach` cleanup
- **Mixing component and E2E concerns**: if you can test it with `mountSuspended`, don't spin up a browser
- **Race conditions on navigation**: use `waitForURL` or `waitForLoadState`, not arbitrary timeouts
- **Selector brittleness**: avoid `.cls-name-xyz` Tailwind-style selectors

## Docs links
- [Library mode](https://playwright.dev/docs/library)
- [Browsers](https://playwright.dev/docs/browsers)
- [Locators](https://playwright.dev/docs/locators)
- [Auto-waiting](https://playwright.dev/docs/actionability)
- [Navigations](https://playwright.dev/docs/navigations)
- [Network](https://playwright.dev/docs/network)
- [Mock APIs](https://playwright.dev/docs/mock)
- [Authentication](https://playwright.dev/docs/auth)
- [Emulation](https://playwright.dev/docs/emulation)
- [Evaluating JavaScript](https://playwright.dev/docs/evaluating)
- [Screenshots](https://playwright.dev/docs/screenshots)
- [Videos](https://playwright.dev/docs/videos)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Debugging](https://playwright.dev/docs/debug)
- API reference
  - [Playwright](https://playwright.dev/docs/api/class-playwright)
  - [BrowserType](https://playwright.dev/docs/api/class-browsertype)
  - [Browser](https://playwright.dev/docs/api/class-browser)
  - [BrowserContext](https://playwright.dev/docs/api/class-browsercontext)
  - [Page](https://playwright.dev/docs/api/class-page)
  - [Locator](https://playwright.dev/docs/api/class-locator)
  - [Frame](https://playwright.dev/docs/api/class-frame)
  - [Route](https://playwright.dev/docs/api/class-route)
  - [Request](https://playwright.dev/docs/api/class-request)
  - [Response](https://playwright.dev/docs/api/class-response)
  - [APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)
- [Nuxt test-utils E2E](https://nuxt.com/docs/getting-started/testing#end-to-end-testing)
