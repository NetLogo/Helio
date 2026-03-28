import { describe, it, expect } from 'vitest';
import permissionDomain from '#src/modules/model-permission/domain/permission.domain.ts';
import { meetsLevel } from '#src/modules/model-permission/domain/permission.types.ts';

const domain = permissionDomain();

describe('permissionDomain', () => {
  describe('createPermission', () => {
    it('creates permission entity', () => {
      const perm = domain.createPermission('model-1', 'user-2', 'write');

      expect(perm.id).toBeTypeOf('string');
      expect(perm.modelId).toBe('model-1');
      expect(perm.granteeUserId).toBe('user-2');
      expect(perm.permissionLevel).toBe('write');
    });
  });
});

describe('meetsLevel', () => {
  it('admin meets all levels', () => {
    expect(meetsLevel('admin', 'read')).toBe(true);
    expect(meetsLevel('admin', 'write')).toBe(true);
    expect(meetsLevel('admin', 'admin')).toBe(true);
  });

  it('write meets read and write', () => {
    expect(meetsLevel('write', 'read')).toBe(true);
    expect(meetsLevel('write', 'write')).toBe(true);
    expect(meetsLevel('write', 'admin')).toBe(false);
  });

  it('read meets only read', () => {
    expect(meetsLevel('read', 'read')).toBe(true);
    expect(meetsLevel('read', 'write')).toBe(false);
    expect(meetsLevel('read', 'admin')).toBe(false);
  });
});
