import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeUserService from '#src/modules/user/user.service.ts';
import userDomain from '#src/modules/user/domain/user.domain.ts';
import { UserNotFoundError, UserProfilePrivateError } from '#src/modules/user/domain/user.errors.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
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
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('userService', () => {
  const userRepository = mockUserRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = userDomain();

  const service = makeUserService({
    transactionManager,
    userRepository,
    userDomain: domain,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('updates profile for self', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await service.updateProfile('user-1', 'user-1', 'user', { userKind: 'student' });

      expect(userRepository.updateFields).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        { userKind: 'student' },
      );
    });

    it('allows admin to update another user', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await service.updateProfile('user-1', 'admin-1', 'admin', { userKind: 'teacher' });

      expect(userRepository.updateFields).toHaveBeenCalled();
    });

    it('rejects non-self non-admin update', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await expect(
        service.updateProfile('user-1', 'other-user', 'user', { userKind: 'student' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects systemRole change by non-admin', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await expect(
        service.updateProfile('user-1', 'user-1', 'user', { systemRole: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to change systemRole', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await service.updateProfile('user-1', 'admin-1', 'admin', { systemRole: 'moderator' });

      expect(userRepository.updateFields).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        { systemRole: 'moderator' },
      );
    });

    it('throws if user not found', async () => {
      userRepository.findOneById.mockResolvedValue(undefined);

      await expect(
        service.updateProfile('missing', 'user-1', 'user', {}),
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('softDelete', () => {
    it('soft deletes user as self', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await service.softDelete('user-1', 'user-1', 'user');

      expect(userRepository.softDelete).toHaveBeenCalledWith(expect.anything(), 'user-1');
    });

    it('rejects non-self non-admin delete', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser());

      await expect(
        service.softDelete('user-1', 'other-user', 'user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('returns public user', async () => {
      const user = makeUser();
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.findById('user-1', 'other', 'user');

      expect(result).toBe(user);
    });

    it('throws for private profile when not self or admin', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser({ isProfilePublic: false }));

      await expect(
        service.findById('user-1', 'other', 'user'),
      ).rejects.toThrow(UserProfilePrivateError);
    });

    it('allows self to view private profile', async () => {
      const user = makeUser({ isProfilePublic: false });
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.findById('user-1', 'user-1', 'user');

      expect(result).toBe(user);
    });

    it('throws for deleted user', async () => {
      userRepository.findOneById.mockResolvedValue(makeUser({ deletedAt: new Date() }));

      await expect(service.findById('user-1', 'user-1', 'user')).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('findAll', () => {
    it('passes publicOnly=true for non-admin', async () => {
      userRepository.search.mockResolvedValue({ count: 0, limit: 20, page: 0, data: [] });

      await service.findAll({}, {}, 'user');

      expect(userRepository.search).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ limit: 20 }),
        true,
      );
    });

    it('passes publicOnly=false for admin', async () => {
      userRepository.search.mockResolvedValue({ count: 0, limit: 20, page: 0, data: [] });

      await service.findAll({}, {}, 'admin');

      expect(userRepository.search).toHaveBeenCalledWith(
        {},
        expect.anything(),
        false,
      );
    });
  });
});
