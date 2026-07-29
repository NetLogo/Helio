import { describe, it, expect } from 'vitest';
import env from '#src/config/env.ts';
import links from '#src/config/links.ts';

const origin = new URL(env.product.website).origin;

describe('links', () => {
  it('builds absolute urls on the product website origin', () => {
    expect(links.model('model-1')).toBe(`${origin}/models/model-1`);
    expect(links.user('user-1')).toBe(`${origin}/users/user-1`);
    expect(links.notificationPreferences()).toBe(`${origin}/settings/notifications`);
  });

  it('highlights a comment inside its thread only when one is given', () => {
    const withHighlight = new URL(links.modelComment('model-1', 'thread-1', 'reply-1'));
    expect(withHighlight.pathname).toBe('/models/model-1/comments/thread-1');
    expect(withHighlight.searchParams.get('highlightedCommentId')).toBe('reply-1');

    const withoutHighlight = new URL(links.modelComment('model-1', 'thread-1'));
    expect(withoutHighlight.searchParams.get('highlightedCommentId')).toBeNull();
  });

  it('escapes path segments rather than letting them alter the path', () => {
    expect(links.user('../admin')).toBe(`${origin}/users/..%2Fadmin`);
  });

  it('points unsubscribe at the support mailbox', () => {
    expect(links.support()).toBe(`mailto:${env.product.supportEmail}`);
  });
});
