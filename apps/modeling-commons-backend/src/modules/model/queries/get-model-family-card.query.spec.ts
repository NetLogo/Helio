import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeGetModelFamilyCardQuery from '#src/modules/model/queries/get-model-family-card.query.ts';
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    visibility: 'public',
    isEndorsed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    latestVersionNumber: 1,
    parentModelId: null,
    parentVersionNumber: null,
    versions: [{ title: 'Hello', description: 'd', versionNumber: 1 }],
    authors: [{ user: { name: 'Alice' } }],
    _count: { versions: 1 },
    ...overrides,
  };
}

function buildQuery(opts: {
  self?: ReturnType<typeof makeRecord> | null;
  parent?: ReturnType<typeof makeRecord> | null;
  siblings?: ReturnType<typeof makeRecord>[];
  children?: ReturnType<typeof makeRecord>[];
}) {
  const findFirst = vi.fn();
  const findMany = vi.fn();
  findFirst.mockResolvedValueOnce(opts.self ?? null);
  if (opts.self?.parentModelId) {
    findFirst.mockResolvedValueOnce(opts.parent ?? null);
    findMany.mockResolvedValueOnce(opts.siblings ?? []);
  }
  findMany.mockResolvedValueOnce(opts.children ?? []);

  const db = { model: { findFirst, findMany } };
  const query = makeGetModelFamilyCardQuery({ db } as never);
  return { query, findFirst, findMany };
}

describe('getModelFamilyCardQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws ModelNotFoundError when the model itself is missing', async () => {
    const { query } = buildQuery({ self: null });
    await expect(query.execute('missing')).rejects.toThrow(ModelNotFoundError);
  });

  it('returns parent=null and siblings=[] for a root model and queries children once', async () => {
    const { query, findMany } = buildQuery({ self: makeRecord() });

    const result = await query.execute('m1');

    expect(result.self.id).toBe('m1');
    expect(result.parent).toBeNull();
    expect(result.siblings).toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('falls back to "Untitled" when the latest version has no record', async () => {
    const { query } = buildQuery({
      self: makeRecord({ versions: [], _count: { versions: 0 } }),
    });

    const result = await query.execute('m1');
    expect(result.self.title).toBe('Untitled');
  });

  it('returns parent and siblings when the model is forked from a parent', async () => {
    const { query } = buildQuery({
      self: makeRecord({ parentModelId: 'p1', parentVersionNumber: 2 }),
      parent: makeRecord({ id: 'p1' }),
      siblings: [makeRecord({ id: 's1' })],
      children: [],
    });

    const result = await query.execute('m1');

    expect(result.parent?.id).toBe('p1');
    expect(result.siblings).toHaveLength(1);
    expect(result.siblings[0]!.id).toBe('s1');
  });

  it('propagates each child\'s parentVersionNumber into its linkedVersionNumber', async () => {
    const { query } = buildQuery({
      self: makeRecord(),
      children: [makeRecord({ id: 'c1', parentModelId: 'm1', parentVersionNumber: 3 })],
    });

    const result = await query.execute('m1');
    expect(result.children[0]!.linkedVersionNumber).toBe(3);
  });
});
