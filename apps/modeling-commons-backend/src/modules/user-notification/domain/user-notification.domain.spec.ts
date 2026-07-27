import { describe, it, expect } from 'vitest';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';

const domain = userNotificationDomain();

describe('userNotificationDomain', () => {
  describe('categories', () => {
    it('exposes exactly the three known categories', () => {
      const names = domain.categories.map((c) => c.category).sort();
      expect(names).toEqual(
        ['comment.on_your_model', 'comment.reply_to_you', 'general.daily_digest'].sort(),
      );
    });

    it('gives every category a label and a description', () => {
      for (const info of domain.categories) {
        expect(info.label.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isKnownCategory', () => {
    it('accepts every catalog category', () => {
      for (const info of domain.categories) {
        expect(domain.isKnownCategory(info.category)).toBe(true);
      }
    });

    it('rejects an unknown category', () => {
      expect(domain.isKnownCategory('comment.mentions_you')).toBe(false);
      expect(domain.isKnownCategory('')).toBe(false);
    });
  });

  describe('resolvePreference', () => {
    it.each(domain.categories.map((info) => [info.category, info.defaults] as const))(
      'falls back to the catalog defaults for %s when there is no override',
      (category, defaults) => {
        expect(domain.resolvePreference(category)).toEqual(defaults);
        expect(domain.resolvePreference(category, null)).toEqual(defaults);
      },
    );

    it('applies an override for both channels', () => {
      const { category, defaults } = domain.categories[0]!;
      const opposite = { email: !defaults.email, inApp: !defaults.inApp };
      expect(domain.resolvePreference(category, opposite)).toEqual(opposite);
    });

    it('merges a partial override, keeping the default for the omitted channel', () => {
      const { category, defaults } = domain.categories[0]!;
      expect(domain.resolvePreference(category, { email: !defaults.email })).toEqual({
        email: !defaults.email,
        inApp: defaults.inApp,
      });
      expect(domain.resolvePreference(category, { inApp: !defaults.inApp })).toEqual({
        email: defaults.email,
        inApp: !defaults.inApp,
      });
    });
  });
});
