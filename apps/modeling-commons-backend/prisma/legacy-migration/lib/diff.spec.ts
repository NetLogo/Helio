import { describe, expect, test } from 'vitest';
import {
  idsBySide,
  isPatchableTable,
  optionalDate,
  optionalString,
  parseTableDiff,
  requireNumber,
} from './diff.ts';

const HEADER = 'side,id,detail\n';

describe('isPatchableTable', () => {
  test('accepts the six tables initial-import.ts migrates', () => {
    for (const t of ['people', 'nodes', 'versions', 'tags', 'tagged_nodes', 'attachments']) {
      expect(isPatchableTable(t)).toBe(true);
    }
  });

  test('rejects tables the archive never mapped', () => {
    for (const t of ['collaborations', 'groups', 'memberships', 'recommendations', 'model_views']) {
      expect(isPatchableTable(t)).toBe(false);
    }
  });
});

describe('parseTableDiff', () => {
  test('reads side and id for each row', () => {
    const diff = parseTableDiff('nodes', `${HEADER}modified,7852,updated_at: [a] -> [b]\n`);
    expect(diff.problems).toEqual([]);
    expect(diff.rows).toEqual([{ side: 'modified', id: 7852, deletedRow: null }]);
  });

  test('keeps the json of deleted rows, since the snapshot no longer has them', () => {
    const detail = '{""id"":7691,""node_id"":7691,""filename"":""a.png""}';
    const diff = parseTableDiff('attachments', `${HEADER}deleted,7691,"${detail}"\n`);
    expect(diff.problems).toEqual([]);
    expect(diff.rows[0]!.deletedRow).toEqual({ id: 7691, node_id: 7691, filename: 'a.png' });
  });

  test('does not try to interpret the detail of modified rows', () => {
    const diff = parseTableDiff(
      'people',
      `${HEADER}modified,5674,"bio: [a] -> [b] | sex: [m] -> [?]"\n`,
    );
    expect(diff.rows[0]!.deletedRow).toBeNull();
  });

  test('survives a detail field containing newlines and delimiters', () => {
    const diff = parseTableDiff(
      'people',
      `${HEADER}modified,5674,"biography: [one\n\ntwo] -> [three]"\nnew,8545,"{}"\n`,
    );
    expect(diff.problems).toEqual([]);
    expect(idsBySide(diff, 'modified')).toEqual([5674]);
    expect(idsBySide(diff, 'new')).toEqual([8545]);
  });

  test('rejects a diff whose table has no id column', () => {
    const diff = parseTableDiff('model_view_counts', 'side,detail\nnew,"{}"\n');
    expect(diff.rows).toEqual([]);
    expect(diff.problems[0]).toMatch(/expected \[side,id,detail\]/);
  });

  test('reports unusable rows instead of dropping them silently', () => {
    const diff = parseTableDiff('nodes', `${HEADER}sideways,1,x\nnew,abc,y\ndeleted,3,not-json\n`);
    expect(diff.rows).toEqual([]);
    expect(diff.problems).toHaveLength(3);
    expect(diff.problems[0]).toMatch(/unknown side/);
    expect(diff.problems[1]).toMatch(/unusable id/);
    expect(diff.problems[2]).toMatch(/unreadable json/);
  });

  test('reports an empty file', () => {
    expect(parseTableDiff('tags', '').problems).toEqual(['tags.csv is empty']);
  });

  test('handles a header-only file as no changes', () => {
    const diff = parseTableDiff('tags', HEADER);
    expect(diff.rows).toEqual([]);
    expect(diff.problems).toEqual([]);
  });
});

describe('deleted-row field readers', () => {
  const row = {
    id: 4986,
    node_id: 7910,
    filename: 'Evolved foraging behaviors.png',
    content_type: 'preview',
    created_at: '2026-05-28T19:02:09.298417',
    missing: null,
  };

  test('requireNumber returns the value', () => {
    expect(requireNumber(row, 'node_id')).toBe(7910);
  });

  test('requireNumber throws rather than guessing', () => {
    expect(() => requireNumber(row, 'missing')).toThrow(/numeric missing/);
    expect(() => requireNumber(row, 'filename')).toThrow();
  });

  test('optionalString returns null for non-strings', () => {
    expect(optionalString(row, 'filename')).toBe('Evolved foraging behaviors.png');
    expect(optionalString(row, 'missing')).toBeNull();
    expect(optionalString(row, 'id')).toBeNull();
  });

  test('optionalDate parses postgres timestamps as local time, truncated to ms', () => {
    const parsed = optionalDate(row, 'created_at')!;
    expect(parsed).toEqual(new Date(2026, 4, 28, 19, 2, 9, 298));
  });

  test('optionalDate returns null for missing or unparseable values', () => {
    expect(optionalDate(row, 'missing')).toBeNull();
    expect(optionalDate({ x: 'not a date' }, 'x')).toBeNull();
  });
});
