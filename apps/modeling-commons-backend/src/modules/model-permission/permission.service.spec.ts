import { describe, it, expect, vi, beforeEach } from 'vitest';
import makePermissionService from '#src/modules/model-permission/permission.service.ts';
import permissionDomain from '#src/modules/model-permission/domain/permission.domain.ts';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
} from '#src/modules/model-permission/domain/permission.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockPermissionRepository } from '#src/modules/model-permission/database/permission.repository.mock.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import type { ModelForPermissionCheck } from '#src/modules/model-permission/domain/permission.types.ts';

function makeModelForCheck(overrides: Partial<ModelForPermissionCheck> = {}): ModelForPermissionCheck {
  return { id: 'model-1', visibility: 'public', deletedAt: null, ...overrides };
}

describe('permissionService', () => {
  const permissionRepository = mockPermissionRepository();
  const eventRepository = mockEventRepository();
  const transactionManager = mockTransactionManager();
  const domain = permissionDomain();

  const service = makePermissionService({
    transactionManager,
    permissionRepository,
    permissionDomain: domain,
    eventRepository,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grant', () => {
    it('creates permission and emits event', async () => {
      permissionRepository.findByModelAndUser.mockResolvedValue(undefined);

      const result = await service.grant('model-1', 'user-2', 'read', 'user-1');

      expect(result.modelId).toBe('model-1');
      expect(result.granteeUserId).toBe('user-2');
      expect(permissionRepository.insertTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model_permission.granted' }),
      );
    });

    it('throws if permission already exists', async () => {
      permissionRepository.findByModelAndUser.mockResolvedValue({ id: 'p1' });

      await expect(service.grant('model-1', 'user-2', 'read', 'user-1')).rejects.toThrow(
        PermissionAlreadyExistsError,
      );
    });
  });

  describe('revoke', () => {
    it('deletes permission and emits event', async () => {
      permissionRepository.findByModelAndUser.mockResolvedValue({ id: 'p1' });

      await service.revoke('model-1', 'user-2', 'user-1');

      expect(permissionRepository.deleteTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model_permission.revoked' }),
      );
    });

    it('throws if permission not found', async () => {
      permissionRepository.findByModelAndUser.mockResolvedValue(undefined);

      await expect(service.revoke('model-1', 'user-2', 'user-1')).rejects.toThrow(
        PermissionNotFoundError,
      );
    });
  });

  describe('listByModel', () => {
    it('delegates to repository', async () => {
      const permissions = [{ id: 'p1' }];
      permissionRepository.findAllByModel.mockResolvedValue(permissions);

      const result = await service.listByModel('model-1');

      expect(result).toBe(permissions);
    });
  });

  describe('check', () => {
    it('returns false for deleted model when not logged in', async () => {
      const result = await service.check(null, makeModelForCheck({ deletedAt: new Date() }), 'read');
      expect(result).toBe(false);
    });

    it('returns true for deleted model owner', async () => {
      permissionRepository.findAuthor.mockResolvedValue({ role: 'owner' });

      const result = await service.check('user-1', makeModelForCheck({ deletedAt: new Date() }), 'read');
      expect(result).toBe(true);
    });

    it('returns false for deleted model non-owner', async () => {
      permissionRepository.findAuthor.mockResolvedValue({ role: 'contributor' });

      const result = await service.check('user-1', makeModelForCheck({ deletedAt: new Date() }), 'read');
      expect(result).toBe(false);
    });

    it('returns true for owner on any level', async () => {
      permissionRepository.findAuthor.mockResolvedValue({ role: 'owner' });

      expect(await service.check('user-1', makeModelForCheck(), 'admin')).toBe(true);
    });

    it('returns true for contributor on read/write', async () => {
      permissionRepository.findAuthor.mockResolvedValue({ role: 'contributor' });

      expect(await service.check('user-1', makeModelForCheck(), 'read')).toBe(true);
      expect(await service.check('user-1', makeModelForCheck(), 'write')).toBe(true);
    });

    it('returns false for contributor on admin', async () => {
      permissionRepository.findAuthor.mockResolvedValue({ role: 'contributor' });
      permissionRepository.findByModelAndUser.mockResolvedValue(undefined);

      expect(await service.check('user-1', makeModelForCheck(), 'admin')).toBe(false);
    });

    it('returns true when explicit grant meets level', async () => {
      permissionRepository.findAuthor.mockResolvedValue(undefined);
      permissionRepository.findByModelAndUser.mockResolvedValue({ permissionLevel: 'admin' });

      expect(await service.check('user-1', makeModelForCheck(), 'write')).toBe(true);
    });

    it('returns true for public model read without auth', async () => {
      expect(await service.check(null, makeModelForCheck({ visibility: 'public' }), 'read')).toBe(true);
    });

    it('returns true for unlisted model read without auth', async () => {
      expect(await service.check(null, makeModelForCheck({ visibility: 'unlisted' }), 'read')).toBe(true);
    });

    it('returns false for private model without auth', async () => {
      expect(await service.check(null, makeModelForCheck({ visibility: 'private' }), 'read')).toBe(false);
    });

    it('returns false for public model write without auth', async () => {
      expect(await service.check(null, makeModelForCheck({ visibility: 'public' }), 'write')).toBe(false);
    });
  });
});
