/**
 * Exhaustive read-only sweep of a populated database.
 *
 * Enumerates every row through Prisma, expands it into every API endpoint,
 * rendered page, stored object and legacy inbound URL it implies, and asserts
 * each responds. The failure this exists to catch: the legacy import and the
 * in-place patch write rows with raw SQL rather than through domain factories,
 * so a migrated row can violate its Typebox response DTO. Fastify's serializer
 * then throws on that one row, and the only way to find it is to request them
 * all.
 *
 * Read-only by construction. No Prisma write method is referenced anywhere in
 * this file.
 *
 * Usage:
 *   yarn sweep [--only=api|web|storage|legacy] [--base-url=…] [--web-url=…]
 *              [--public-base=…] [--sample=N] [--concurrency=N] [--fail-fast]
 */

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '#prisma/index';

type Cohort = 'api' | 'web' | 'storage' | 'legacy';

type Check = {
  cohort: Cohort;
  path: string;
  status: number | null;
  expect: number[];
  ms: number;
  rowId?: string;
  table?: string;
  error?: string;
};

type Options = {
  cohorts: Cohort[];
  baseUrl: string;
  webUrl: string;
  publicBase: string | null;
  sample: number | null;
  concurrency: number;
  failFast: boolean;
  reportDir: string;
};

const ALL_COHORTS: Cohort[] = ['api', 'web', 'storage', 'legacy'];

/**
 * Every GET path in the OpenAPI document must be either expanded by
 * `buildApiChecks` or listed here with a reason. An unlisted, unexpanded path
 * aborts the run: that is what makes the sweep exhaustive rather than
 * best-effort.
 */
const SKIP: Record<string, string> = {
  '/api/v1/admin/events': 'admin-only (requireAuth + requireRole(admin))',
  '/api/v1/model-drafts': 'auth-only (requireAuth)',
  '/api/v1/model-drafts/{id}': 'auth-only (requireAuth + resolveModelDraft)',
  '/api/v1/users/whoami': 'auth-only (requireAuth)',
  '/api/v1/models/{id}/permissions': 'admin-only (requireAuth + resolveModel(admin))',
};

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };

  const only = get('only');
  const cohorts = only ? (only.split(',') as Cohort[]) : ALL_COHORTS;
  for (const c of cohorts) {
    if (!ALL_COHORTS.includes(c)) throw new Error(`unknown cohort "${c}"`);
  }

  const sample = get('sample');
  const concurrency = get('concurrency');

  return {
    cohorts,
    baseUrl: (get('base-url') ?? 'http://127.0.0.1:3000').replace(/\/$/, ''),
    webUrl: (get('web-url') ?? 'http://127.0.0.1:3005').replace(/\/$/, ''),
    publicBase: get('public-base')?.replace(/\/$/, '') ?? null,
    sample: sample ? Number(sample) : null,
    concurrency: concurrency ? Number(concurrency) : 16,
    failFast: argv.includes('--fail-fast'),
    reportDir: resolve(import.meta.dirname, '..', 'reports'),
  };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

function limitRows<T>(rows: T[], sample: number | null): T[] {
  return sample === null ? rows : rows.slice(0, sample);
}

async function request(
  cohort: Cohort,
  url: string,
  path: string,
  method: 'GET' | 'HEAD',
  meta: { rowId?: string; table?: string; expect?: number[] },
): Promise<Check> {
  const { expect = [200], ...rest } = meta;
  const started = performance.now();
  try {
    const res = await fetch(url, { method, redirect: 'manual' });
    const ms = Math.round(performance.now() - started);
    const check: Check = { cohort, path, status: res.status, expect, ms, ...rest };

    if (cohort === 'web' && res.status === 200) {
      const body = await res.text();
      if (isNuxtErrorPage(body)) {
        check.error = 'nuxt error page marker present in body';
      }
    }
    return check;
  } catch (err) {
    return {
      cohort,
      path,
      status: null,
      expect,
      ms: Math.round(performance.now() - started),
      ...rest,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function isNuxtErrorPage(body: string): boolean {
  return (
    body.includes('__NUXT_ERROR__') ||
    body.includes('data-nuxt-error') ||
    /<title>\s*(404|500)\b/i.test(body)
  );
}

function ok(check: Check): boolean {
  if (check.error) return false;
  return check.status !== null && check.expect.includes(check.status);
}

async function fetchOpenApiGetPaths(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api-docs/openapi.json`);
  if (!res.ok) throw new Error(`cannot read OpenAPI document: HTTP ${res.status}`);
  const spec = (await res.json()) as { paths: Record<string, Record<string, unknown>> };
  return Object.entries(spec.paths)
    .filter(([, methods]) => 'get' in methods)
    .map(([path]) => path);
}

/**
 * Anonymous reads are refused for rows the public is not entitled to, so the
 * sweep asserts the entitled status per row rather than a blanket 200. A
 * soft-deleted model answering 200 is a defect; so is a public one answering
 * 404.
 */
type ModelRow = { id: string; expect: number[] };

type Enumerated = {
  models: ModelRow[];
  visibleModelIds: string[];
  modelVersions: { modelId: string; versionNumber: number; expect: number[] }[];
  userIds: string[];
  tagKeys: string[];
  legacyModels: { legacyId: number; expect: number[] }[];
  files: { table: string; rowId: string; key: string }[];
};

function expectedModelStatus(row: {
  visibility: string;
  deletedAt: Date | null;
}): number[] {
  if (row.deletedAt !== null) return [404];
  if (row.visibility === 'private') return [403];
  return [200];
}

async function enumerate(prisma: PrismaClient, sample: number | null): Promise<Enumerated> {
  const modelRows = limitRows(
    await prisma.model.findMany({
      select: { id: true, visibility: true, deletedAt: true },
      orderBy: { id: 'asc' },
    }),
    sample,
  );
  const models: ModelRow[] = modelRows.map((m) => ({ id: m.id, expect: expectedModelStatus(m) }));
  const expectById = new Map(models.map((m) => [m.id, m.expect]));
  const modelIds = models.map((m) => m.id);

  const versions = await prisma.modelVersion.findMany({
    select: { modelId: true, versionNumber: true },
    where: modelIds.length ? { modelId: { in: modelIds } } : undefined,
    orderBy: [{ modelId: 'asc' }, { versionNumber: 'asc' }],
  });

  const users = limitRows(
    await prisma.user.findMany({
      select: { id: true },
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    }),
    sample,
  );

  const tags = limitRows(
    await prisma.tag.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }),
    sample,
  );

  const legacyRows = limitRows(
    await prisma.model.findMany({
      select: { legacyId: true, visibility: true, deletedAt: true },
      where: { legacyId: { not: null } },
      orderBy: { legacyId: 'asc' },
    }),
    sample,
  );

  const files: Enumerated['files'] = [];
  const versionFiles = await prisma.modelVersion.findMany({
    select: {
      modelId: true,
      versionNumber: true,
      netlogoFileKey: true,
      previewImageFileKey: true,
    },
    orderBy: [{ modelId: 'asc' }, { versionNumber: 'asc' }],
  });
  for (const v of limitRows(versionFiles, sample)) {
    const rowId = `${v.modelId}@${v.versionNumber}`;
    files.push({ table: 'ModelVersion.netlogoFileKey', rowId, key: v.netlogoFileKey });
    if (v.previewImageFileKey) {
      files.push({
        table: 'ModelVersion.previewImageFileKey',
        rowId,
        key: v.previewImageFileKey,
      });
    }
  }

  const additional = await prisma.modelAdditionalFile.findMany({
    select: { id: true, fileKey: true },
    orderBy: { id: 'asc' },
  });
  for (const f of limitRows(additional, sample)) {
    files.push({ table: 'ModelAdditionalFile.fileKey', rowId: f.id, key: f.fileKey });
  }

  const avatars = await prisma.user.findMany({
    select: { id: true, image: true },
    where: { image: { not: null } },
    orderBy: { id: 'asc' },
  });
  for (const u of limitRows(avatars, sample)) {
    if (u.image && !/^https?:\/\//i.test(u.image)) {
      files.push({ table: 'User.image', rowId: u.id, key: u.image });
    }
  }

  return {
    models,
    visibleModelIds: models.filter((m) => m.expect[0] === 200).map((m) => m.id),
    modelVersions: versions.map((v) => ({
      modelId: v.modelId,
      versionNumber: v.versionNumber,
      expect: expectById.get(v.modelId) ?? [200],
    })),
    userIds: users.map((u) => u.id),
    tagKeys: [...tags.map((t) => t.id), ...tags.map((t) => t.name)],
    legacyModels: legacyRows.flatMap((m) =>
      m.legacyId === null ? [] : [{ legacyId: m.legacyId, expect: expectedModelStatus(m) }],
    ),
    files,
  };
}

/**
 * Walks a paginated collection to its last page. The DTO reports `total` and
 * `limit`, so the page count is known after the first request; every page is
 * then requested, not just page 1.
 */
async function paginate(baseUrl: string, path: string, limit = 50): Promise<string[]> {
  const sep = path.includes('?') ? '&' : '?';
  const first = `${path}${sep}limit=${limit}&page=1`;
  const res = await fetch(`${baseUrl}${first}`);
  if (!res.ok) return [first];
  // `count` is the field name in shared/api/paginated.response.base.ts. Reading
  // `total` silently yields undefined and collapses every walk to page 1.
  const body = (await res.json()) as { count?: number };
  const pages = Math.max(1, Math.ceil((body.count ?? 0) / limit));
  return Array.from({ length: pages }, (_, i) => `${path}${sep}limit=${limit}&page=${i + 1}`);
}

type Target = { path: string; expect: number[]; rowId?: string };

async function buildApiChecks(
  baseUrl: string,
  data: Enumerated,
): Promise<{ targets: Target[]; covered: Set<string> }> {
  const targets: Target[] = [];
  const covered = new Set<string>();
  const push = (path: string, expect: number[] = [200], rowId?: string) =>
    targets.push({ path, expect, rowId });

  const cover = (specPath: string) => covered.add(specPath);

  push('/api/health');
  cover('/api/health');

  push('/api/v1/netlogo-versions');
  cover('/api/v1/netlogo-versions');

  push('/api/v1/models/random');
  cover('/api/v1/models/random');

  for (const collection of ['/api/v1/models', '/api/v1/models/card', '/api/v1/users', '/api/v1/tags', '/api/v1/tags/popular']) {
    for (const p of await paginate(baseUrl, collection)) push(p);
    cover(collection);
  }

  for (const { id, expect } of data.models) {
    for (const suffix of [
      '',
      '/additional-files',
      '/authors',
      '/card',
      '/family/card',
      '/interactions',
      '/likes',
      '/me/permissions',
    ]) {
      push(`/api/v1/models/${id}${suffix}`, expect, id);
    }
    // Pagination is only walkable where the collection is readable.
    if (expect[0] === 200) {
      for (const p of await paginate(baseUrl, `/api/v1/models/${id}/versions`)) push(p, [200], id);
      for (const p of await paginate(baseUrl, `/api/v1/models/${id}/children`)) push(p, [200], id);
    } else {
      push(`/api/v1/models/${id}/versions?limit=50&page=1`, expect, id);
      push(`/api/v1/models/${id}/children?limit=50&page=1`, expect, id);
    }
  }
  for (const p of [
    '/api/v1/models/{id}',
    '/api/v1/models/{id}/additional-files',
    '/api/v1/models/{id}/authors',
    '/api/v1/models/{id}/card',
    '/api/v1/models/{id}/family/card',
    '/api/v1/models/{id}/interactions',
    '/api/v1/models/{id}/likes',
    '/api/v1/models/{id}/me/permissions',
    '/api/v1/models/{id}/versions',
    '/api/v1/models/{id}/children',
  ]) {
    cover(p);
  }

  for (const { modelId, versionNumber, expect } of data.modelVersions) {
    const base = `/api/v1/models/${modelId}/versions/${versionNumber}`;
    push(base, expect, modelId);
    push(`${base}/card`, expect, modelId);
    push(`${base}/tags`, expect, modelId);
  }
  cover('/api/v1/models/{id}/versions/{version}');
  cover('/api/v1/models/{id}/versions/{version}/card');
  cover('/api/v1/models/{id}/versions/{version}/tags');

  for (const id of data.userIds) {
    push(`/api/v1/users/${id}`, [200], id);
    for (const p of await paginate(baseUrl, `/api/v1/users/${id}/models`)) push(p, [200], id);
  }
  cover('/api/v1/users/{id}');
  cover('/api/v1/users/{id}/models');

  for (const key of data.tagKeys) {
    push(`/api/v1/tags/${encodeURIComponent(key)}`, [200], key);
  }
  cover('/api/v1/tags/{idOrName}');

  // Resolution is by legacy id alone, so it answers even for models the
  // anonymous caller may not then read.
  for (const { legacyId } of data.legacyModels) {
    push(`/api/v1/legacy/models/${legacyId}/resolve`, [200, 404], String(legacyId));
  }
  cover('/api/v1/legacy/models/{legacyId}/resolve');

  return { targets, covered };
}

function buildWebTargets(data: Enumerated): Target[] {
  const targets: Target[] = [
    '/',
    '/about',
    '/donate',
    '/models',
    '/featured-models',
    '/new-models',
    '/tags',
    '/privacy',
    '/terms-of-service',
    '/cookies',
  ].map((path) => ({ path, expect: [200] }));

  // Only publicly readable models are expected to render. Pages for private
  // and soft-deleted models must not answer 200; that is asserted separately
  // so a leak shows up as a failure rather than as a skipped row.
  for (const id of data.visibleModelIds) {
    targets.push({ path: `/models/${id}`, expect: [200], rowId: id });
    targets.push({ path: `/models/${id}/embed`, expect: [200], rowId: id });
  }
  for (const { id, expect } of data.models) {
    if (expect[0] === 200) continue;
    targets.push({ path: `/models/${id}`, expect: [403, 404], rowId: id });
  }
  for (const id of data.userIds) {
    targets.push({ path: `/users/${id}`, expect: [200], rowId: id });
    targets.push({ path: `/users/${id}/models`, expect: [200], rowId: id });
  }
  for (const key of data.tagKeys) {
    targets.push({ path: `/tags/${encodeURIComponent(key)}`, expect: [200], rowId: key });
  }
  return targets;
}

async function runApi(opts: Options, data: Enumerated): Promise<Check[]> {
  const specPaths = await fetchOpenApiGetPaths(opts.baseUrl);
  const { targets, covered } = await buildApiChecks(opts.baseUrl, data);

  const unaccounted = specPaths.filter((p) => !covered.has(p) && !(p in SKIP));
  if (unaccounted.length) {
    throw new Error(
      `OpenAPI GET paths neither expanded nor listed in SKIP:\n  ${unaccounted.join('\n  ')}\n` +
        'Add each to buildApiChecks or to SKIP with a reason.',
    );
  }

  const stale = Object.keys(SKIP).filter((p) => !specPaths.includes(p));
  if (stale.length) {
    throw new Error(`SKIP lists paths absent from the spec:\n  ${stale.join('\n  ')}`);
  }

  return mapLimit(targets, opts.concurrency, (t) =>
    request('api', `${opts.baseUrl}${t.path}`, t.path, 'GET', {
      expect: t.expect,
      rowId: t.rowId,
    }),
  );
}

async function runWeb(opts: Options, data: Enumerated): Promise<Check[]> {
  return mapLimit(buildWebTargets(data), opts.concurrency, (t) =>
    request('web', `${opts.webUrl}${t.path}`, t.path, 'GET', {
      expect: t.expect,
      rowId: t.rowId,
    }),
  );
}

/**
 * Object existence is asserted through the S3 API with credentials, not by
 * anonymous HTTP. The bucket is not world-readable in any environment we
 * control (local seaweedfs defines only an authenticated identity), so an
 * anonymous HEAD reports 403 for present and absent keys alike and cannot
 * distinguish them. `--public-base` additionally asserts anonymous
 * reachability, which is what the production `cdn.*` host has to provide.
 */
async function runStorage(opts: Options, data: Enumerated): Promise<Check[]> {
  const s3 = new S3Client({
    region: process.env['STORE_REGION'] ?? 'us-east-1',
    endpoint: process.env['STORE_ENDPOINT'],
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env['STORE_ACCESS_KEY'] ?? '',
      secretAccessKey: process.env['STORE_SECRET_KEY'] ?? '',
    },
  });
  const bucket = process.env['STORE_BUCKET'] ?? '';

  const existence = await mapLimit(data.files, opts.concurrency, async (f): Promise<Check> => {
    const started = performance.now();
    const meta = { rowId: f.rowId, table: f.table, expect: [200] };
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: f.key }));
      return {
        cohort: 'storage',
        path: f.key,
        status: 200,
        ms: Math.round(performance.now() - started),
        ...meta,
      };
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && '$metadata' in err
          ? ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode ?? null)
          : null;
      return {
        cohort: 'storage',
        path: f.key,
        status,
        ms: Math.round(performance.now() - started),
        ...meta,
        error: err instanceof Error ? err.name : String(err),
      };
    }
  });

  if (!opts.publicBase) return existence;

  const publicChecks = await mapLimit(data.files, opts.concurrency, (f) =>
    request('storage', `${opts.publicBase}/${f.key}`, `public:${f.key}`, 'HEAD', {
      rowId: f.rowId,
      table: f.table,
    }),
  );
  return [...existence, ...publicChecks];
}

/**
 * The promotion moves the app onto the legacy domain, so every inbound link
 * that used to work must keep working. The frontend resolves a legacy numeric
 * id and 301s to the canonical model URL; both halves are asserted.
 */
async function runLegacy(opts: Options, data: Enumerated): Promise<Check[]> {
  const checks: Check[] = [];
  const results = await mapLimit(data.legacyModels, opts.concurrency, async (row) => {
    const path = `/browse/one_model/${row.legacyId}`;
    const redirect = await request('legacy', `${opts.webUrl}${path}`, path, 'GET', {
      rowId: String(row.legacyId),
      table: 'Model.legacyId',
      expect: [301, 302],
    });
    if (!ok(redirect)) {
      redirect.error = redirect.error ?? `expected 301, got ${redirect.status}`;
      return [redirect];
    }
    const location = await fetch(`${opts.webUrl}${path}`, { method: 'GET', redirect: 'manual' })
      .then((r) => r.headers.get('location'))
      .catch(() => null);
    if (!location) {
      redirect.error = '301 carried no Location header';
      return [redirect];
    }
    const followed = await request(
      'legacy',
      location.startsWith('http') ? location : `${opts.webUrl}${location}`,
      location,
      'GET',
      {
        rowId: String(row.legacyId),
        table: 'Model.legacyId -> target',
        expect: row.expect[0] === 200 ? [200] : [403, 404],
      },
    );
    return [redirect, followed];
  });
  for (const group of results) checks.push(...group);
  return checks;
}

function summarise(checks: Check[]): string {
  const byCohort = new Map<Cohort, { total: number; failed: number }>();
  for (const c of checks) {
    const entry = byCohort.get(c.cohort) ?? { total: 0, failed: 0 };
    entry.total += 1;
    if (!ok(c)) entry.failed += 1;
    byCohort.set(c.cohort, entry);
  }

  const lines = ['# Sweep report', '', '| Cohort | Checks | Failed |', '|---|---|---|'];
  for (const [cohort, { total, failed }] of byCohort) {
    lines.push(`| ${cohort} | ${total} | ${failed} |`);
  }

  const failures = checks.filter((c) => !ok(c));
  if (failures.length) {
    lines.push('', `## First ${Math.min(50, failures.length)} of ${failures.length} failures`, '');
    lines.push('| Cohort | Path | Status | Expected | Table | Row | Error |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const f of failures.slice(0, 50)) {
      lines.push(
        `| ${f.cohort} | ${f.path} | ${f.status ?? '-'} | ${f.expect.join('/')} | ${f.table ?? '-'} | ${f.rowId ?? '-'} | ${f.error ?? '-'} |`,
      );
    }
  }
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
  const prisma = new PrismaClient({ adapter });

  try {
    const data = await enumerate(prisma, opts.sample);
    console.log(
      `enumerated: ${data.models.length} models (${data.visibleModelIds.length} public), ` +
        `${data.modelVersions.length} versions, ${data.userIds.length} users, ` +
        `${data.tagKeys.length} tag keys, ${data.legacyModels.length} legacy ids, ` +
        `${data.files.length} file keys`,
    );

    const runners: Record<Cohort, () => Promise<Check[]>> = {
      api: () => runApi(opts, data),
      web: () => runWeb(opts, data),
      storage: () => runStorage(opts, data),
      legacy: () => runLegacy(opts, data),
    };

    const all: Check[] = [];
    for (const cohort of opts.cohorts) {
      console.log(`running cohort: ${cohort}`);
      const checks = await runners[cohort]();
      all.push(...checks);
      await mkdir(opts.reportDir, { recursive: true });
      await writeFile(
        resolve(opts.reportDir, `sweep-${cohort}.json`),
        JSON.stringify(checks, null, 2),
      );
      const failed = checks.filter((c) => !ok(c)).length;
      console.log(`  ${checks.length} checks, ${failed} failed`);
      if (failed && opts.failFast) break;
    }

    const markdown = summarise(all);
    await writeFile(resolve(opts.reportDir, 'sweep-summary.md'), markdown);
    console.log(`\n${markdown}`);

    process.exitCode = all.some((c) => !ok(c)) ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
