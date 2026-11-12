import { describe, it, expect } from 'vitest';
import { hasDeliverableEmail } from '#src/modules/user-notification/core/recipient.domain.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    image: null,
    systemRole: 'user',
    userKind: 'researcher',
    isProfilePublic: true,
    onboardedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    banned: null,
    banReason: null,
    banExpires: null,
    bio: null,
    country: null,
    socialLinks: null,
    dob: null,
    affiliation: null,
    role: null,
    legacyId: null,
    ...overrides,
  };
}

describe('hasDeliverableEmail', () => {
  it('accepts an active recipient with an email address', () => {
    expect(hasDeliverableEmail(makeUser())).toBe(true);
  });

  it('rejects a missing recipient', () => {
    expect(hasDeliverableEmail(undefined)).toBe(false);
  });

  it('rejects a deleted recipient', () => {
    expect(hasDeliverableEmail(makeUser({ deletedAt: new Date() }))).toBe(false);
  });

  it('rejects a banned recipient', () => {
    expect(hasDeliverableEmail(makeUser({ banned: true }))).toBe(false);
  });

  it('rejects a recipient without an email address', () => {
    expect(hasDeliverableEmail(makeUser({ email: null }))).toBe(false);
  });
});
