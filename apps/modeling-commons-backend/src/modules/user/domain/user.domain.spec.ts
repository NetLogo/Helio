import { describe, it, expect } from 'vitest';
import userDomain from '#src/modules/user/domain/user.domain.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

const domain = userDomain();

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    name: 'Test',
    email: 'test@example.com',
    emailVerified: true,
    image: null,
    systemRole: 'user',
    userKind: 'researcher',
    isProfilePublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('userDomain', () => {
  describe('assertNotDeleted', () => {
    it('passes for active user', () => {
      expect(() => domain.assertNotDeleted(makeUser())).not.toThrow();
    });

    it('throws for deleted user', () => {
      expect(() => domain.assertNotDeleted(makeUser({ deletedAt: new Date() }))).toThrow();
    });
  });

  describe('canViewProfile', () => {
    it('returns true for public profile', () => {
      expect(domain.canViewProfile(makeUser(), null, null)).toBe(true);
    });

    it('returns false for private profile with no auth', () => {
      expect(domain.canViewProfile(makeUser({ isProfilePublic: false }), null, null)).toBe(false);
    });

    it('returns true for self viewing private profile', () => {
      expect(domain.canViewProfile(makeUser({ isProfilePublic: false }), 'user-1', 'user')).toBe(
        true,
      );
    });

    it('returns true for admin viewing private profile', () => {
      expect(domain.canViewProfile(makeUser({ isProfilePublic: false }), 'admin-1', 'admin')).toBe(
        true,
      );
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin', () => {
      expect(domain.isAdmin('admin')).toBe(true);
    });

    it('returns false for non-admin', () => {
      expect(domain.isAdmin('user')).toBe(false);
      expect(domain.isAdmin(null)).toBe(false);
    });
  });

  describe('extractPublicView', () => {
    it('returns only public fields', () => {
      const user = makeUser({
        email: 'secret@example.com',
        image: 'https://example.com/avatar.jpg',
        systemRole: 'admin',
        userKind: 'researcher',
      });
      const view = domain.extractPublicView(user);

      expect(view).toEqual({
        id: user.id,
        name: user.name,
        isProfilePublic: user.isProfilePublic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(view).not.toHaveProperty('email');
      expect(view).not.toHaveProperty('emailVerified');
      expect(view).not.toHaveProperty('image');
      expect(view).not.toHaveProperty('systemRole');
      expect(view).not.toHaveProperty('userKind');
    });
  });

  describe('isSelfOrAdmin', () => {
    it('returns true for self', () => {
      expect(domain.isSelfOrAdmin('user-1', 'user-1', 'user')).toBe(true);
    });

    it('returns true for admin', () => {
      expect(domain.isSelfOrAdmin('user-1', 'admin-1', 'admin')).toBe(true);
    });

    it('returns false for other user', () => {
      expect(domain.isSelfOrAdmin('user-1', 'user-2', 'user')).toBe(false);
    });
  });
});
