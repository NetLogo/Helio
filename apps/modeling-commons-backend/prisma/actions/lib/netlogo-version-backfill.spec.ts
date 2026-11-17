import { describe, expect, test } from 'vitest';
import {
  countBackfillOutcomes,
  describeBackfillSummary,
  parseBackfillOptions,
  planBackfillOutcome,
  type BackfillOutcome,
} from './netlogo-version-backfill.ts';

const SEP = '@#$#@#$#@';
const row = { modelId: 'm1', versionNumber: 2, netlogoFileKey: 'uploads/models/2026/ants.nlogo' };

function sectioned(version: string): Buffer {
  return Buffer.from(['code', 'ui', 'info', 'shapes', version].join(SEP));
}

describe('parseBackfillOptions', () => {
  test('defaults to applying in batches of 100', () => {
    expect(parseBackfillOptions([])).toEqual({ dryRun: false, batchSize: 100 });
  });

  test('reads --dry-run and --batch-size', () => {
    expect(parseBackfillOptions(['--dry-run', '--batch-size=25'])).toEqual({
      dryRun: true,
      batchSize: 25,
    });
  });

  test.each(['--batch-size=0', '--batch-size=abc', '--batch-size=2.5'])('rejects %s', (arg) => {
    expect(() => parseBackfillOptions([arg])).toThrow('--batch-size');
  });
});

describe('planBackfillOutcome', () => {
  test('plans the bare version read from the stored file', () => {
    expect(planBackfillOutcome(row, sectioned('NetLogo 6.4.0'))).toEqual({
      kind: 'update',
      row,
      netlogoVersion: '6.4.0',
    });
  });

  test('reads an .nlogox file by the extension at the end of its key', () => {
    const nlogoxRow = { ...row, netlogoFileKey: 'uploads/models/wolf-sheep.nlogox' };
    const xml = Buffer.from('<?xml version="1.0"?><model version="NetLogo 7.0.3"></model>');
    expect(planBackfillOutcome(nlogoxRow, xml)).toEqual({
      kind: 'update',
      row: nlogoxRow,
      netlogoVersion: '7.0.3',
    });
  });

  test('skips a file that could not be read', () => {
    expect(planBackfillOutcome(row, null)).toEqual({ kind: 'unreadable', row });
  });

  test('skips a file whose version cannot be parsed', () => {
    expect(planBackfillOutcome(row, Buffer.from('to setup end'))).toEqual({
      kind: 'unparseable',
      row,
    });
  });

  test('skips a key without a NetLogo extension', () => {
    const otherRow = { ...row, netlogoFileKey: 'uploads/models/notes.txt' };
    expect(planBackfillOutcome(otherRow, sectioned('NetLogo 6.4.0')).kind).toBe('unparseable');
  });
});

describe('countBackfillOutcomes', () => {
  test('adds each outcome to the running summary', () => {
    const outcomes: BackfillOutcome[] = [
      { kind: 'update', row, netlogoVersion: '6.4.0' },
      { kind: 'update', row, netlogoVersion: '7.0.0' },
      { kind: 'unreadable', row },
      { kind: 'unparseable', row },
    ];
    const start = { scanned: 10, updated: 3, unreadable: 1, unparseable: 0 };
    expect(countBackfillOutcomes(start, outcomes)).toEqual({
      scanned: 14,
      updated: 5,
      unreadable: 2,
      unparseable: 1,
    });
  });
});

describe('describeBackfillSummary', () => {
  const summary = { scanned: 4, updated: 2, unreadable: 1, unparseable: 1 };

  test('says what a dry run would update', () => {
    expect(describeBackfillSummary(summary, true)).toBe(
      'scanned 4, would update 2, skipped 1 unreadable and 1 unparseable',
    );
  });

  test('says what an apply run updated', () => {
    expect(describeBackfillSummary(summary, false)).toBe(
      'scanned 4, updated 2, skipped 1 unreadable and 1 unparseable',
    );
  });
});
