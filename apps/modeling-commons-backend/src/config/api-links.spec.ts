import { describe, it, expect } from 'vitest';
import env from '#src/config/env.ts';
import apiLinks, { createApiLinks } from '#src/config/api-links.ts';

describe('apiLinks', () => {
  it('points the one-click unsubscribe at the API route with its token', () => {
    const url = new URL(apiLinks.notificationUnsubscribe('a.b+c/d'));
    expect(url.origin).toBe(new URL(env.auth.url).origin);
    expect(url.pathname).toBe('/api/v1/notification-unsubscribe');
    expect(url.searchParams.get('token')).toBe('a.b+c/d');
  });

  it.each([
    'https://commons.example.org',
    'https://commons.example.org/',
    'https://commons.example.org/api/auth',
    'https://commons.example.org/api/auth/',
  ])('builds the one-click unsubscribe on the origin of %s', (baseUrl) => {
    expect(createApiLinks(baseUrl).notificationUnsubscribe('a.b+c/d')).toBe(
      'https://commons.example.org/api/v1/notification-unsubscribe?token=a.b%2Bc%2Fd',
    );
  });
});
