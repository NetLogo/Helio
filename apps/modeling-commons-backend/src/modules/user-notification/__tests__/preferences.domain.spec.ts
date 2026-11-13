import { describe, it, expect } from 'vitest';
import {
  categories,
  listCategoriesSwitchedOn,
} from '#src/modules/user-notification/preferences/preferences.domain.ts';
import type { EmailMode } from '#prisma/index';

describe('categories', () => {
  it('exposes exactly the two known categories', () => {
    const names = categories.map((c) => c.category).sort();
    expect(names).toEqual(['comment.on_your_model', 'comment.reply_to_you'].sort());
  });

  it('gives every category a label and a description', () => {
    for (const info of categories) {
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });
});

describe('listCategoriesSwitchedOn', () => {
  it.each<[EmailMode, EmailMode]>([
    ['daily', 'immediate'],
    ['off', 'immediate'],
    ['immediate', 'daily'],
    ['off', 'daily'],
  ])('lists a category switched from %s to %s', (previous, next) => {
    expect(
      listCategoriesSwitchedOn(
        { 'comment.on_your_model': previous },
        { 'comment.on_your_model': next },
      ),
    ).toEqual(['comment.on_your_model']);
  });

  it.each<[EmailMode, EmailMode]>([
    ['immediate', 'immediate'],
    ['daily', 'daily'],
    ['off', 'off'],
    ['daily', 'off'],
    ['immediate', 'off'],
  ])('lists nothing for %s to %s', (previous, next) => {
    expect(
      listCategoriesSwitchedOn(
        { 'comment.on_your_model': previous },
        { 'comment.on_your_model': next },
      ),
    ).toEqual([]);
  });

  it('lists every switched category', () => {
    expect(
      listCategoriesSwitchedOn(
        { 'comment.on_your_model': 'daily', 'comment.reply_to_you': 'daily' },
        { 'comment.on_your_model': 'immediate', 'comment.reply_to_you': 'immediate' },
      ).sort(),
    ).toEqual(['comment.on_your_model', 'comment.reply_to_you']);
  });
});
