import { describe, expect, it } from 'vitest';
import { getServerCapabilities, getServerRole, ServerRole } from '#src/config/role.ts';

describe('getServerCapabilities', () => {
  it.each([
    [ServerRole.API, { api: true, worker: false, sse: false }],
    [ServerRole.WORKER, { api: false, worker: true, sse: false }],
    [ServerRole.SSE, { api: false, worker: false, sse: true }],
    [ServerRole.STANDALONE, { api: true, worker: true, sse: true }],
  ])('gives the %s role exactly its capabilities', (role, capabilities) => {
    expect(getServerCapabilities(role)).toEqual(capabilities);
  });
});

describe('getServerRole', () => {
  it('keeps an explicit role in development', () => {
    expect(getServerRole(ServerRole.SSE, true)).toBe(ServerRole.SSE);
  });

  it('defaults to standalone in development and api elsewhere', () => {
    expect(getServerRole(undefined, true)).toBe(ServerRole.STANDALONE);
    expect(getServerRole(undefined, false)).toBe(ServerRole.API);
  });
});
