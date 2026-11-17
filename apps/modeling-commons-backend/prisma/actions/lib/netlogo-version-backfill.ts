import { detectNetlogoVersion } from '#src/shared/utils/netlogo-file.ts';

export type BackfillRow = {
  modelId: string;
  versionNumber: number;
  netlogoFileKey: string;
};

export type BackfillOutcome =
  | { kind: 'update'; row: BackfillRow; netlogoVersion: string }
  | { kind: 'unreadable'; row: BackfillRow }
  | { kind: 'unparseable'; row: BackfillRow };

export type BackfillSummary = {
  scanned: number;
  updated: number;
  unreadable: number;
  unparseable: number;
};

export type BackfillOptions = { dryRun: boolean; batchSize: number };

const DEFAULT_BATCH_SIZE = 100;

export function parseBackfillOptions(argv: string[]): BackfillOptions {
  const batchArg = argv.find((arg) => arg.startsWith('--batch-size='));
  const batchSize = batchArg ? Number(batchArg.slice('--batch-size='.length)) : DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error(`--batch-size must be a positive integer, got ${batchArg}`);
  }
  return { dryRun: argv.includes('--dry-run'), batchSize };
}

export function planBackfillOutcome(row: BackfillRow, contents: Buffer | null): BackfillOutcome {
  if (!contents) return { kind: 'unreadable', row };
  const filename = row.netlogoFileKey.split('/').pop() ?? row.netlogoFileKey;
  const netlogoVersion = detectNetlogoVersion({ buffer: contents, filename });
  return netlogoVersion ? { kind: 'update', row, netlogoVersion } : { kind: 'unparseable', row };
}

export function countBackfillOutcomes(
  summary: BackfillSummary,
  outcomes: BackfillOutcome[],
): BackfillSummary {
  return outcomes.reduce(
    (acc, outcome) => ({
      ...acc,
      scanned: acc.scanned + 1,
      updated: acc.updated + (outcome.kind === 'update' ? 1 : 0),
      unreadable: acc.unreadable + (outcome.kind === 'unreadable' ? 1 : 0),
      unparseable: acc.unparseable + (outcome.kind === 'unparseable' ? 1 : 0),
    }),
    summary,
  );
}

export function describeBackfillOutcome(outcome: BackfillOutcome): string {
  const target = `${outcome.row.modelId} v${outcome.row.versionNumber} (${outcome.row.netlogoFileKey})`;
  if (outcome.kind === 'update') return `set ${outcome.netlogoVersion}: ${target}`;
  return `skip ${outcome.kind}: ${target}`;
}

export function describeBackfillSummary(summary: BackfillSummary, dryRun: boolean): string {
  const verb = dryRun ? 'would update' : 'updated';
  return `scanned ${summary.scanned}, ${verb} ${summary.updated}, skipped ${summary.unreadable} unreadable and ${summary.unparseable} unparseable`;
}
