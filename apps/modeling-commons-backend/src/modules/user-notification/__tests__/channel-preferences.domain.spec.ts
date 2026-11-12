import { describe, it, expect } from 'vitest';
import {
  notificationCategories,
  notificationCategoryCatalog,
} from '#src/modules/notification-catalog.ts';
import {
  isKnownCategory,
  isMuted,
  listDailyCategories,
  listInAppEnabledCategories,
  resolveChannelPreferences,
  resolvePreferencesByCategory,
  sendsEmailImmediately,
} from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import type { Category } from '#src/modules/user-notification/core/types/index.ts';
import type { EmailMode } from '#prisma/index';

const categories = notificationCategories.map((category) => ({
  category,
  ...notificationCategoryCatalog[category],
}));

function otherMode(mode: EmailMode): EmailMode {
  return mode === 'daily' ? 'off' : 'daily';
}

describe('isKnownCategory', () => {
  it('accepts every catalog category', () => {
    for (const info of categories) {
      expect(isKnownCategory(info.category)).toBe(true);
    }
  });

  it('rejects an unknown category', () => {
    expect(isKnownCategory('comment.mentions_you')).toBe(false);
    expect(isKnownCategory('')).toBe(false);
  });
});

describe('resolveChannelPreferences', () => {
  it.each(categories.map((info) => [info.category, info.defaults] as const))(
    'falls back to the catalog defaults for %s when there is no override',
    (category, defaults) => {
      expect(resolveChannelPreferences(category)).toEqual(defaults);
      expect(resolveChannelPreferences(category, null)).toEqual(defaults);
    },
  );

  it('applies an override for both channels', () => {
    const { category, defaults } = categories[0]!;
    const opposite = { email: otherMode(defaults.email), inApp: !defaults.inApp };
    expect(resolveChannelPreferences(category, opposite)).toEqual(opposite);
  });

  it('merges a partial override, keeping the default for the omitted channel', () => {
    const { category, defaults } = categories[0]!;
    expect(resolveChannelPreferences(category, { email: otherMode(defaults.email) })).toEqual({
      email: otherMode(defaults.email),
      inApp: defaults.inApp,
    });
    expect(resolveChannelPreferences(category, { inApp: !defaults.inApp })).toEqual({
      email: defaults.email,
      inApp: !defaults.inApp,
    });
  });
});

describe('resolvePreferencesByCategory', () => {
  it('resolves every category to its defaults when there are no overrides', () => {
    const preferences = resolvePreferencesByCategory([]);

    for (const { category, defaults } of categories) {
      expect(preferences[category]).toEqual(defaults);
    }
  });

  it('applies an override to its own category only and ignores unknown categories', () => {
    const preferences = resolvePreferencesByCategory([
      { category: 'comment.on_your_model', email: 'off' },
      { category: 'comment.mentions_you', email: 'daily' },
    ]);

    expect(preferences['comment.on_your_model'].email).toBe('off');
    expect(preferences['comment.reply_to_you']).toEqual(
      resolveChannelPreferences('comment.reply_to_you'),
    );
    expect(Object.keys(preferences).sort()).toEqual(categories.map((info) => info.category).sort());
  });
});

describe('listInAppEnabledCategories', () => {
  it('falls back to the catalog defaults when the user has no overrides', () => {
    expect(listInAppEnabledCategories([])).toEqual(
      categories.filter((info) => info.defaults.inApp).map((info) => info.category),
    );
  });

  it('drops a category the user muted in-app', () => {
    const result = listInAppEnabledCategories([
      { category: 'comment.on_your_model', inApp: false },
    ]);

    expect(result).not.toContain('comment.on_your_model');
  });

  it('ignores an override that only touches the email channel', () => {
    const result = listInAppEnabledCategories([
      { category: 'comment.on_your_model', email: 'off' },
    ]);

    expect(result).toContain('comment.on_your_model');
  });
});

describe('isMuted', () => {
  it('mutes when both channels are off', () => {
    expect(isMuted({ email: 'off', inApp: false })).toBe(true);
  });

  it.each<Category.ChannelPreferences>([
    { email: 'immediate', inApp: false },
    { email: 'daily', inApp: false },
    { email: 'off', inApp: true },
    { email: 'immediate', inApp: true },
  ])('does not mute when a channel is on: %o', (channels) => {
    expect(isMuted(channels)).toBe(false);
  });
});

describe('sendsEmailImmediately', () => {
  it('is true only for the immediate email mode', () => {
    expect(sendsEmailImmediately({ email: 'immediate', inApp: false })).toBe(true);
    expect(sendsEmailImmediately({ email: 'daily', inApp: true })).toBe(false);
    expect(sendsEmailImmediately({ email: 'off', inApp: true })).toBe(false);
  });
});

describe('listDailyCategories', () => {
  it('lists categories whose resolved email mode is daily', () => {
    expect(
      listDailyCategories([
        { category: 'comment.on_your_model', email: 'daily' },
        { category: 'comment.reply_to_you', email: 'off' },
      ]),
    ).toEqual(['comment.on_your_model']);
  });

  it('lists nothing for a user on the catalog defaults', () => {
    expect(listDailyCategories([])).toEqual([]);
  });

  it('ignores overrides of unknown categories', () => {
    expect(listDailyCategories([{ category: 'comment.mentions_you', email: 'daily' }])).toEqual([]);
  });
});
