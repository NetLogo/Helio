import { describe, it, expect } from 'vitest';
import mailDomain from '#src/modules/mail/domain/mail.domain.ts';

describe('mailDomain createNotificationSummaryEmail', () => {
  const domain = mailDomain();
  const items = [
    {
      text: 'Alice, Bob, and 1 other commented on Wolf Sheep',
      url: 'https://example.test/models/wolf',
    },
    { text: 'Carol commented on Virus', url: 'https://example.test/models/virus' },
  ];

  async function render(moreCount: number) {
    return domain.createNotificationSummaryEmail(
      'owner@example.test',
      'Owner',
      items,
      moreCount,
      'https://example.test/notifications',
      'https://example.test/unsubscribe',
      'https://example.test/settings/notifications',
    );
  }

  it('renders one linked line per item', async () => {
    const email = await render(0);

    expect(email.to).toBe('owner@example.test');
    for (const item of items) {
      expect(email.text).toContain(item.text);
      expect(email.html).toContain(`href="${item.url}"`);
    }
  });

  it('links the rest to the feed as "and N more"', async () => {
    const email = await render(7);

    expect(email.text).toContain('and 7 more');
    expect(email.html).toContain('href="https://example.test/notifications"');
  });

  it('has no "more" link when every line fits', async () => {
    const email = await render(0);

    expect(email.text).not.toContain('more');
    expect(email.html).not.toContain('https://example.test/notifications"');
  });
});
