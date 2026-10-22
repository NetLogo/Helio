import { describe, expect, test } from 'vitest';
import { decodeLegacyBody, linkParents, mapPosting, type CommentContext } from './comments.ts';
import type { LegacyPosting } from './legacy.ts';

const MODEL = 'model-id-1';
const USER = 'user-id-1';
const NOW = new Date('2026-01-01T00:00:00Z');
const CREATED = new Date('2011-03-04T05:06:07Z');
const UPDATED = new Date('2012-03-04T05:06:07Z');
const DELETED = new Date('2013-03-04T05:06:07Z');

function ctx(overrides: Partial<CommentContext> = {}): CommentContext {
  let n = 0;
  return {
    userIdByLegacyId: new Map([[10, USER]]),
    modelIdByLegacyId: new Map([[20, MODEL]]),
    newId: () => `comment-${++n}`,
    now: () => NOW,
    ...overrides,
  };
}

function posting(overrides: Partial<LegacyPosting> = {}): LegacyPosting {
  return {
    id: 1,
    person_id: 10,
    node_id: 20,
    parent_id: null,
    body: 'Nice model',
    deleted_at: null,
    created_at: CREATED,
    updated_at: UPDATED,
    ...overrides,
  };
}

describe('decodeLegacyBody', () => {
  test('decodes the standard entities and the legacy &rt; for >', () => {
    expect(decodeLegacyBody('if x &lt; 3 &amp;&amp; y &rt; 2 [ show &quot;it&#39;s&quot; ] &gt;')).toBe(
      `if x < 3 && y > 2 [ show "it's" ] >`,
    );
  });

  test('decodes a double-encoded entity only once', () => {
    expect(decodeLegacyBody('&amp;lt;b&amp;gt; and &amp;rt;')).toBe('&lt;b&gt; and &rt;');
  });

  test('normalizes CRLF and lone CR to LF', () => {
    expect(decodeLegacyBody('one\r\ntwo\rthree\nfour')).toBe('one\ntwo\nthree\nfour');
  });

  test('leaves unknown entities and null untouched', () => {
    expect(decodeLegacyBody('&nbsp;&copy;')).toBe('&nbsp;&copy;');
    expect(decodeLegacyBody(null)).toBeNull();
  });
});

describe('mapPosting', () => {
  test('maps a live posting onto its migrated model and user', () => {
    expect(mapPosting(posting(), ctx())).toEqual({
      id: 'comment-1',
      legacyId: 1,
      modelId: MODEL,
      userId: USER,
      parentId: null,
      content: 'Nice model',
      createdAt: CREATED,
      updatedAt: UPDATED,
      deletedAt: null,
    });
  });

  test('a posting whose node was not migrated is skipped', () => {
    expect(mapPosting(posting({ node_id: 99 }), ctx())).toBeNull();
    expect(mapPosting(posting({ node_id: null }), ctx())).toBeNull();
  });

  test('an unknown or null author keeps the comment with a null userId', () => {
    expect(mapPosting(posting({ person_id: 99 }), ctx())?.userId).toBeNull();
    expect(mapPosting(posting({ person_id: null }), ctx())?.userId).toBeNull();
  });

  test('decodes the body of a live posting', () => {
    expect(mapPosting(posting({ body: 'a &lt; b\r\n' }), ctx())?.content).toBe('a < b\n');
  });

  test('a soft-deleted posting becomes a tombstone with its deletedAt kept', () => {
    const row = mapPosting(posting({ deleted_at: DELETED }), ctx());
    expect(row?.content).toBeNull();
    expect(row?.deletedAt).toEqual(DELETED);
  });

  test('a null updated_at falls back to created_at, a null created_at to now', () => {
    expect(mapPosting(posting({ updated_at: null }), ctx())?.updatedAt).toEqual(CREATED);
    const undated = mapPosting(posting({ created_at: null, updated_at: null }), ctx());
    expect(undated?.createdAt).toEqual(NOW);
    expect(undated?.updatedAt).toEqual(NOW);
  });
});

describe('linkParents', () => {
  const imported = new Map([
    [1, 'c-1'],
    [2, 'c-2'],
    [3, 'c-3'],
  ]);

  test('links a reply to its parent, including a parent with a higher legacy id', () => {
    const { links, skippedOrphanParent } = linkParents(
      [
        { id: 2, parent_id: 1 },
        { id: 1, parent_id: 3 },
      ],
      imported,
    );
    expect(links).toEqual([
      { id: 'c-2', parentId: 'c-1' },
      { id: 'c-1', parentId: 'c-3' },
    ]);
    expect(skippedOrphanParent).toBe(0);
  });

  test('a reply whose parent or own row was not imported stays top-level and is counted', () => {
    const { links, skippedOrphanParent } = linkParents(
      [
        { id: 2, parent_id: 99 },
        { id: 99, parent_id: 1 },
        { id: 3, parent_id: null },
      ],
      imported,
    );
    expect(links).toEqual([]);
    expect(skippedOrphanParent).toBe(3);
  });
});
