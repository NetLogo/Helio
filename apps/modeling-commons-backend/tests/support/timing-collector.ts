import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface TimingRecord {
  method: string;
  url: string;
  statusCode: number;
  elapsedMs: number;
  scenario?: string;
  timestamp: number;
}

export interface ScenarioTag {
  name: string;
  status: string;
  durationMs: number;
}

const records: TimingRecord[] = [];
const scenarios: ScenarioTag[] = [];
let activeScenario: string | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_RE = /^[0-9a-f]{24,36}$/i;
const NUMERIC_RE = /^\d+$/;

const normaliseUrl = (rawUrl: string): string => {
  const [pathOnly] = rawUrl.split('?');
  const path = pathOnly ?? rawUrl;
  const segments = path.split('/');
  const normalised = segments.map((seg) => {
    if (!seg) return seg;
    if (UUID_RE.test(seg)) return ':id';
    if (HEX_ID_RE.test(seg)) return ':id';
    if (NUMERIC_RE.test(seg)) return ':id';
    return seg;
  });
  return normalised.join('/');
};

const percentile = (sortedValues: number[], p: number): number => {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return sortedValues[idx] ?? 0;
};

export const setActiveScenario = (name: string | undefined): void => {
  activeScenario = name;
};

export const recordRequest = (input: Omit<TimingRecord, 'scenario' | 'timestamp'>): void => {
  records.push({
    ...input,
    scenario: activeScenario,
    timestamp: Date.now(),
  });
};

export const attachScenarioTag = (tag: ScenarioTag): void => {
  scenarios.push(tag);
};

export const getSnapshot = (): { records: TimingRecord[]; scenarios: ScenarioTag[] } => ({
  records: [...records],
  scenarios: [...scenarios],
});

export const resetCollector = (): void => {
  records.length = 0;
  scenarios.length = 0;
  activeScenario = undefined;
};

interface RouteStats {
  method: string;
  template: string;
  count: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  total: number;
  statusCodes: Record<string, number>;
}

const aggregate = (rs: TimingRecord[]): RouteStats[] => {
  const groups = new Map<string, TimingRecord[]>();
  for (const r of rs) {
    const template = normaliseUrl(r.url);
    const key = `${r.method} ${template}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  const stats: RouteStats[] = [];
  for (const [key, list] of groups) {
    const [method, ...rest] = key.split(' ');
    const template = rest.join(' ');
    const sorted = [...list].map((x) => x.elapsedMs).sort((a, b) => a - b);
    const total = sorted.reduce((acc, n) => acc + n, 0);
    const statusCodes: Record<string, number> = {};
    for (const r of list) {
      const sc = String(r.statusCode);
      statusCodes[sc] = (statusCodes[sc] ?? 0) + 1;
    }
    stats.push({
      method: method ?? '',
      template,
      count: list.length,
      min: sorted[0] ?? 0,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted[sorted.length - 1] ?? 0,
      mean: list.length > 0 ? total / list.length : 0,
      total,
      statusCodes,
    });
  }
  return stats.sort((a, b) => b.total - a.total);
};

const fmt = (n: number): string => n.toFixed(2);

const buildMarkdown = (rs: TimingRecord[], stats: RouteStats[]): string => {
  const totalRequests = rs.length;
  const totalWall = rs.reduce((acc, r) => acc + r.elapsedMs, 0);
  const slowestRequests = [...rs].sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 10);
  const slowestRoutes = [...stats].sort((a, b) => b.p95 - a.p95).slice(0, 5);

  const lines: string[] = [];
  lines.push('# E2E timing report');
  lines.push('');
  lines.push(`- Total requests: ${totalRequests}`);
  lines.push(`- Total handler wall-time: ${fmt(totalWall)} ms`);
  lines.push(`- Distinct route templates: ${stats.length}`);
  lines.push('');
  lines.push('## Slowest 10 individual requests');
  lines.push('');
  lines.push('| # | Method | URL | Status | Elapsed (ms) | Scenario |');
  lines.push('|---|--------|-----|--------|--------------|----------|');
  slowestRequests.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.method} | ${r.url} | ${r.statusCode} | ${fmt(r.elapsedMs)} | ${r.scenario ?? '-'} |`,
    );
  });
  lines.push('');
  lines.push('## Top 5 slowest route templates by p95');
  lines.push('');
  lines.push('| Method | Template | Count | p95 (ms) | p99 (ms) | Max (ms) |');
  lines.push('|--------|----------|-------|----------|----------|----------|');
  slowestRoutes.forEach((s) => {
    lines.push(
      `| ${s.method} | ${s.template} | ${s.count} | ${fmt(s.p95)} | ${fmt(s.p99)} | ${fmt(s.max)} |`,
    );
  });
  lines.push('');
  lines.push('## Per-route stats (sorted by total time)');
  lines.push('');
  lines.push(
    '| Method | Template | Count | Total (ms) | Mean | Min | p50 | p95 | p99 | Max | Status codes |',
  );
  lines.push(
    '|--------|----------|-------|------------|------|-----|-----|-----|-----|-----|--------------|',
  );
  stats.forEach((s) => {
    const sc = JSON.stringify(s.statusCodes);
    lines.push(
      `| ${s.method} | ${s.template} | ${s.count} | ${fmt(s.total)} | ${fmt(s.mean)} | ${fmt(s.min)} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.p99)} | ${fmt(s.max)} | ${sc} |`,
    );
  });
  lines.push('');
  return lines.join('\n');
};

const ensureDir = (filePath: string): void => {
  mkdirSync(dirname(filePath), { recursive: true });
};

export const writeReport = (mdPath: string, jsonPath?: string): void => {
  try {
    const snap = getSnapshot();
    const stats = aggregate(snap.records);

    ensureDir(mdPath);
    writeFileSync(mdPath, buildMarkdown(snap.records, stats), 'utf8');

    if (jsonPath) {
      ensureDir(jsonPath);
      const payload = {
        generatedAt: new Date().toISOString(),
        totalRequests: snap.records.length,
        totalElapsedMs: snap.records.reduce((acc, r) => acc + r.elapsedMs, 0),
        routes: stats,
        scenarios: snap.scenarios,
      };
      writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[timing-collector] failed to write report: ${msg}`);
  }
};

export const isTimingEnabled = (): boolean => process.env['CUCUMBER_TIMING'] === '1';
