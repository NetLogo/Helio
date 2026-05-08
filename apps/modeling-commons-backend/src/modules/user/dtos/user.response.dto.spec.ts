import { describe, it, expect } from 'vitest';
import build from 'fast-json-stringify';
import { Value } from 'typebox/value';
import { userResponseDtoSchema } from './user.response.dto.ts';

const fullProfile = {
  id: '2355982b-bfb8-488d-bbae-ae5b5ad32d4a',
  name: 'Omar I',
  isProfilePublic: true,
  image: 'http://127.0.0.1:41090/modeling-commons/files/public/avatars/x.png',
  email: 'omar@example.com',
  emailVerified: true,
  systemRole: 'user',
  userKind: 'researcher',
  onboardedAt: '2026-05-04T17:11:07.638Z',
  createdAt: '2026-05-04T17:11:07.638Z',
  updatedAt: '2026-05-04T17:48:11.046Z',
};

const publicProfile = {
  id: '2355982b-bfb8-488d-bbae-ae5b5ad32d4a',
  name: 'Omar I',
  isProfilePublic: true,
  image: null,
  createdAt: '2026-05-04T17:11:07.638Z',
  updatedAt: '2026-05-04T17:48:11.046Z',
};

describe('userResponseDtoSchema (response serialization invariant)', () => {
  const stringify = build(userResponseDtoSchema as unknown as Parameters<typeof build>[0]);

  it('preserves every private field when serializing a full profile', () => {
    const serialized = JSON.parse(stringify(fullProfile));
    expect(serialized).toMatchObject({
      emailVerified: fullProfile.emailVerified,
      systemRole: fullProfile.systemRole,
      userKind: fullProfile.userKind,
      onboardedAt: fullProfile.onboardedAt,
    });
  });

  it('preserves every public field on a full profile', () => {
    const serialized = JSON.parse(stringify(fullProfile));
    expect(serialized).toMatchObject({
      id: fullProfile.id,
      name: fullProfile.name,
      isProfilePublic: fullProfile.isProfilePublic,
      image: fullProfile.image,
      createdAt: fullProfile.createdAt,
      updatedAt: fullProfile.updatedAt,
    });
  });

  it('serializes a public-only profile without error', () => {
    const serialized = JSON.parse(stringify(publicProfile));
    expect(serialized).toMatchObject(publicProfile);
    expect(serialized.email).toBeUndefined();
    expect(serialized.systemRole).toBeUndefined();
  });

  it('accepts both shapes against the schema', () => {
    expect(Value.Check(userResponseDtoSchema, fullProfile)).toBe(true);
    expect(Value.Check(userResponseDtoSchema, publicProfile)).toBe(true);
  });
});
