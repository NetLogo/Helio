/**
 * Read-only invariant checks. Every step here issues GETs and Prisma reads and
 * nothing else; the row-count guard in `tests/support/data-integrity-guard.ts`
 * fails the run at runtime if that ever stops being true.
 *
 * Sampling is deterministic (first N by id order) so a failure reproduces.
 * Exhaustive enumeration is `yarn sweep`, not this cohort.
 */

import assert from 'node:assert/strict';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Then, When } from '@cucumber/cucumber';
import { ID_PATTERN } from '#src/shared/utils/id.ts';
import type { ICustomWorld } from '../../support/custom-world.ts';

// Shapes the id migration replaced. A survivor means a row was missed.
const LEGACY_ID_SOURCE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|c[a-z0-9]{24}';

function db(world: ICustomWorld) {
  return world.server.diContainer.cradle.prisma;
}

async function query<T>(world: ICustomWorld, sql: string): Promise<T[]> {
  return (await db(world).$queryRawUnsafe(sql)) as T[];
}

async function get(world: ICustomWorld, url: string) {
  return world.server.inject({ method: 'GET', url });
}

function bag<T>(world: ICustomWorld, key: string): T {
  return world.context[key] as T;
}

function describeAll(records: Record<string, unknown>[]): string[] {
  return records.map((r) =>
    JSON.stringify(r, (_k, v: unknown) => (typeof v === 'bigint' ? Number(v) : v)),
  );
}

// The application's own configured client, taken from the DI container, rather
// than one rebuilt from process.env. It is the client whose credentials and
// endpoint actually matter, and it removes any question of whether the cucumber
// process loaded the same environment the app did.
async function objectExists(world: ICustomWorld, key: string): Promise<boolean> {
  // `bucket` in the container is an S3 Bucket object, not a name; the services
  // all pass `bucket.Name`. Passing the object yields a TypeError that a bare
  // catch would report as "object missing".
  const { storage, bucket } = world.server.diContainer.cradle as unknown as {
    storage: S3Client;
    bucket: { Name?: string };
  };
  try {
    await storage.send(new HeadObjectCommand({ Bucket: bucket.Name, Key: key }));
    return true;
  } catch (err) {
    if (err instanceof TypeError) throw err;
    return false;
  }
}

type SampledModel = { id: string };
type SampledVersion = {
  modelId: string;
  versionNumber: number;
  netlogoFileKey: string;
  previewImageFileKey: string | null;
};
type SampledUser = { id: string; image: string | null };
type SampledTag = { id: string; name: string };

When('I walk every page of {string}', async function (this: ICustomWorld, path: string) {
  const statuses: number[] = [];
  const limit = 50;
  let page = 1;
  let pages = 1;

  do {
    const res = await get(this, `${path}?limit=${limit}&page=${page}`);
    statuses.push(res.statusCode);
    if (page === 1 && res.statusCode === 200) {
      const body = JSON.parse(res.body) as { count?: number };
      pages = Math.max(1, Math.ceil((body.count ?? 0) / limit));
    }
    page += 1;
  } while (page <= pages);

  this.context['pageStatuses'] = statuses;
});

Then('every page returned 200', function (this: ICustomWorld) {
  const statuses = bag<number[]>(this, 'pageStatuses');
  assert.ok(statuses.length > 0, 'no pages were requested');
  assert.deepEqual(
    statuses.filter((s) => s !== 200),
    [],
    `pages returned non-200: ${statuses.join(',')}`,
  );
});

When('I sample {int} public models', async function (this: ICustomWorld, n: number) {
  this.context['models'] = await db(this).model.findMany({
    where: { deletedAt: null, visibility: 'public' },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: n,
  });
});

Then(
  'each one returns 200 with every required field populated',
  async function (this: ICustomWorld) {
    const models = bag<SampledModel[]>(this, 'models');
    assert.ok(models.length > 0, 'no public models to sample');
    for (const m of models) {
      const res = await get(this, `/api/v1/models/${m.id}`);
      assert.equal(res.statusCode, 200, `model ${m.id} returned ${res.statusCode}`);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      for (const field of ['id', 'visibility', 'createdAt']) {
        assert.ok(
          body[field] !== undefined && body[field] !== null,
          `model ${m.id} is missing ${field}`,
        );
      }
    }
  },
);

Then('every model has at least one version', async function (this: ICustomWorld) {
  const orphans = await db(this).model.findMany({
    where: { deletedAt: null, versions: { none: {} } },
    select: { id: true },
    take: 20,
  });
  assert.deepEqual(
    orphans.map((m) => m.id),
    [],
    'models with zero versions',
  );
});

Then(
  "every model's latestVersionNumber equals the maximum of its version numbers",
  async function (this: ICustomWorld) {
    const drifted = await query<{ id: string; stored: number; actual: number }>(
      this,
      `SELECT m.id, m."latestVersionNumber" AS stored, MAX(v."versionNumber") AS actual
       FROM "Model" m
       JOIN "ModelVersion" v ON v."modelId" = m.id
       WHERE m."deletedAt" IS NULL
       GROUP BY m.id, m."latestVersionNumber"
       HAVING m."latestVersionNumber" IS DISTINCT FROM MAX(v."versionNumber")
       LIMIT 20`,
    );
    assert.deepEqual(describeAll(drifted), [], 'latestVersionNumber drifted');
  },
);

Then('no soft-deleted model appears in the model listing', async function (this: ICustomWorld) {
  const deleted = await db(this).model.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: 25,
  });
  if (deleted.length === 0) return;

  const res = await get(this, '/api/v1/models?limit=100&page=1');
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body) as { data?: { id: string }[] };
  const listed = new Set((body.data ?? []).map((m) => m.id));
  for (const m of deleted) {
    assert.ok(!listed.has(m.id), `soft-deleted model ${m.id} appears in the listing`);
  }
});

Then(
  "every soft-deleted model's detail route refuses anonymous access",
  async function (this: ICustomWorld) {
    const deleted = await db(this).model.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 25,
    });
    for (const m of deleted) {
      const res = await get(this, `/api/v1/models/${m.id}`);
      assert.ok(
        res.statusCode === 404 || res.statusCode === 403,
        `soft-deleted model ${m.id} returned ${res.statusCode}, expected 404 or 403`,
      );
    }
  },
);

When('I sample {int} model versions', async function (this: ICustomWorld, n: number) {
  this.context['versions'] = await db(this).modelVersion.findMany({
    where: { model: { deletedAt: null, visibility: 'public' } },
    select: {
      modelId: true,
      versionNumber: true,
      netlogoFileKey: true,
      previewImageFileKey: true,
    },
    orderBy: [{ modelId: 'asc' }, { versionNumber: 'asc' }],
    take: n,
  });
});

Then('each version returns 200', async function (this: ICustomWorld) {
  const versions = bag<SampledVersion[]>(this, 'versions');
  assert.ok(versions.length > 0, 'no versions to sample');
  for (const v of versions) {
    const res = await get(this, `/api/v1/models/${v.modelId}/versions/${v.versionNumber}`);
    assert.equal(
      res.statusCode,
      200,
      `version ${v.modelId}@${v.versionNumber} returned ${res.statusCode}`,
    );
  }
});

Then(
  "each version's netlogo file key resolves to a stored object",
  async function (this: ICustomWorld) {
    const versions = bag<SampledVersion[]>(this, 'versions');
    const missing: string[] = [];
    for (const v of versions) {
      if (!(await objectExists(this, v.netlogoFileKey))) {
        missing.push(`${v.modelId}@${v.versionNumber} -> ${v.netlogoFileKey}`);
      }
    }
    assert.deepEqual(missing, [], 'file keys with no stored object');
  },
);

Then(
  "every version's changeSummary is null or a non-empty string",
  async function (this: ICustomWorld) {
    const bad = await query<{ modelId: string; versionNumber: number }>(
      this,
      `SELECT "modelId", "versionNumber" FROM "ModelVersion"
       WHERE "changeSummary" IS NOT NULL AND btrim("changeSummary") = ''
       LIMIT 20`,
    );
    assert.deepEqual(describeAll(bad), [], 'versions with a blank changeSummary');
  },
);

Then("every model's version numbers run from 1 with no gaps", async function (this: ICustomWorld) {
  const bad = await query<{ modelId: string; lo: number; hi: number; n: bigint }>(
    this,
    `SELECT "modelId", MIN("versionNumber") AS lo, MAX("versionNumber") AS hi, COUNT(*) AS n
     FROM "ModelVersion"
     GROUP BY "modelId"
     HAVING MIN("versionNumber") <> 1 OR MAX("versionNumber") <> COUNT(*)
     LIMIT 20`,
  );
  assert.deepEqual(describeAll(bad), [], 'version numbering is not contiguous');
});

When('I sample {int} users', async function (this: ICustomWorld, n: number) {
  this.context['users'] = await db(this).user.findMany({
    where: { deletedAt: null },
    select: { id: true, image: true },
    orderBy: { id: 'asc' },
    take: n,
  });
});

Then('each user profile returns 200', async function (this: ICustomWorld) {
  const users = bag<SampledUser[]>(this, 'users');
  assert.ok(users.length > 0, 'no users to sample');
  for (const u of users) {
    const res = await get(this, `/api/v1/users/${u.id}`);
    assert.equal(res.statusCode, 200, `user ${u.id} returned ${res.statusCode}`);
  }
});

Then("each user's image is null or resolves", async function (this: ICustomWorld) {
  const users = bag<SampledUser[]>(this, 'users');
  const missing: string[] = [];
  for (const u of users) {
    if (!u.image) continue;
    // A remote avatar (OAuth provider) is not ours to guarantee.
    if (/^https?:\/\//i.test(u.image)) continue;
    if (!(await objectExists(this, u.image))) missing.push(`${u.id} -> ${u.image}`);
  }
  assert.deepEqual(missing, [], 'avatars with no stored object');
});

Then(
  "each user's models route returns 200 with a total matching the database",
  async function (this: ICustomWorld) {
    const users = bag<SampledUser[]>(this, 'users');
    for (const u of users) {
      const res = await get(this, `/api/v1/users/${u.id}/models?limit=1&page=1`);
      assert.equal(res.statusCode, 200, `user ${u.id} models returned ${res.statusCode}`);
      // The route counts authorship rows, unfiltered by visibility or deletion
      // (`modelAuthorRepository.findModelsByUser`). Mirror that, or this
      // asserts a policy the route never claimed rather than the invariant
      // that its count matches its own source table.
      const count = (JSON.parse(res.body) as { count?: number }).count ?? 0;
      const expected = await db(this).modelAuthor.count({ where: { userId: u.id } });
      assert.equal(
        count,
        expected,
        `user ${u.id}: route reports ${count}, database has ${expected}`,
      );
    }
  },
);

Then('no soft-deleted user appears in the user listing', async function (this: ICustomWorld) {
  const deleted = await db(this).user.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
    take: 25,
  });
  if (deleted.length === 0) return;

  const res = await get(this, '/api/v1/users?limit=100&page=1');
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body) as { data?: { id: string }[] };
  const listed = new Set((body.data ?? []).map((u) => u.id));
  for (const u of deleted) {
    assert.ok(!listed.has(u.id), `soft-deleted user ${u.id} appears in the listing`);
  }
});

When('I sample {int} tags', async function (this: ICustomWorld, n: number) {
  this.context['tags'] = await db(this).tag.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
    take: n,
  });
});

Then('each tag page returns 200', async function (this: ICustomWorld) {
  const tags = bag<SampledTag[]>(this, 'tags');
  assert.ok(tags.length > 0, 'no tags to sample');
  for (const t of tags) {
    const res = await get(this, `/api/v1/tags/${encodeURIComponent(t.name)}`);
    assert.equal(res.statusCode, 200, `tag ${t.name} returned ${res.statusCode}`);
  }
});

Then('no tag has a blank name', async function (this: ICustomWorld) {
  const blank = await query<{ id: string }>(
    this,
    `SELECT id FROM "Tag" WHERE name IS NULL OR btrim(name) = '' LIMIT 20`,
  );
  assert.deepEqual(
    blank.map((t) => t.id),
    [],
    'tags with a blank name',
  );
});

const ID_TABLES: { table: string; column: string }[] = [
  { table: 'Model', column: 'id' },
  { table: 'User', column: 'id' },
  { table: 'Tag', column: 'id' },
  { table: 'ModelAdditionalFile', column: 'id' },
  { table: 'ModelPermission', column: 'id' },
  { table: 'ModelInteraction', column: 'id' },
  { table: 'ModelDraft', column: 'id' },
  { table: 'Event', column: 'id' },
  { table: 'NonMemberContributor', column: 'id' },
];

Then('every id in every mapped table matches the id convention', async function (this: ICustomWorld) {
  const offenders: string[] = [];
  for (const { table, column } of ID_TABLES) {
    const bad = await query<{ id: string }>(
      this,
      `SELECT "${column}" AS id FROM "${table}" WHERE "${column}" !~ '${ID_PATTERN}' LIMIT 5`,
    );
    for (const r of bad) offenders.push(`${table}.${column}=${r.id}`);
  }
  assert.deepEqual(offenders, [], 'off-convention ids');
});

Then('every stored file key matches the key convention', async function (this: ICustomWorld) {
  const offenders: string[] = [];
  const sources = [
    { table: 'ModelVersion', column: 'netlogoFileKey' },
    { table: 'ModelVersion', column: 'previewImageFileKey' },
    { table: 'ModelAdditionalFile', column: 'fileKey' },
  ];
  for (const { table, column } of sources) {
    const bad = await query<{ key: string }>(
      this,
      `SELECT "${column}" AS key FROM "${table}"
       WHERE "${column}" IS NOT NULL AND "${column}" ~* '${LEGACY_ID_SOURCE}' LIMIT 5`,
    );
    for (const r of bad) offenders.push(`${table}.${column}=${r.key}`);
  }
  assert.deepEqual(offenders, [], 'file keys carrying a pre-migration id');
});

Then('no soft reference contains an off-convention id', async function (this: ICustomWorld) {
  const offenders: string[] = [];
  const checks = [
    {
      // A version is addressed by its composite key, so `<modelId>:<n>` is a
      // legitimate resourceId alongside a bare id.
      label: 'Event.resourceId',
      sql: `SELECT "resourceId" AS v FROM "Event"
            WHERE "resourceId" !~ '${ID_PATTERN}'
              AND "resourceId" !~ '${ID_PATTERN.replace(/\$$/, '')}:[0-9]+$' LIMIT 5`,
    },
    {
      label: 'Event.payload',
      sql: `SELECT id AS v FROM "Event" WHERE payload::text ~* '${LEGACY_ID_SOURCE}' LIMIT 5`,
    },
    {
      label: 'ModelDraft.data',
      sql: `SELECT id AS v FROM "ModelDraft" WHERE data::text ~* '${LEGACY_ID_SOURCE}' LIMIT 5`,
    },
    {
      label: 'User.image',
      sql: `SELECT id AS v FROM "User"
            WHERE image IS NOT NULL AND image !~ '^https?://' AND image ~* '${LEGACY_ID_SOURCE}' LIMIT 5`,
    },
  ];
  for (const c of checks) {
    const bad = await query<{ v: string }>(this, c.sql);
    for (const r of bad) offenders.push(`${c.label}: ${r.v}`);
  }
  assert.deepEqual(offenders, [], 'soft references with a pre-migration id');
});

Then(
  "every model's stored interaction counts equal a recomputation from the log",
  async function (this: ICustomWorld) {
    const drifted = await query<Record<string, unknown>>(
      this,
      `SELECT m.id,
              m."viewCount"     AS stored_view,
              m."runCount"      AS stored_run,
              m."downloadCount" AS stored_download,
              m."shareCount"    AS stored_share,
              COUNT(*) FILTER (WHERE i.kind = 'view')     AS actual_view,
              COUNT(*) FILTER (WHERE i.kind = 'run')      AS actual_run,
              COUNT(*) FILTER (WHERE i.kind = 'download') AS actual_download,
              COUNT(*) FILTER (WHERE i.kind = 'share')    AS actual_share
       FROM "Model" m
       LEFT JOIN "ModelInteraction" i ON i."modelId" = m.id
       GROUP BY m.id, m."viewCount", m."runCount", m."downloadCount", m."shareCount"
       HAVING m."viewCount"     <> COUNT(*) FILTER (WHERE i.kind = 'view')
           OR m."runCount"      <> COUNT(*) FILTER (WHERE i.kind = 'run')
           OR m."downloadCount" <> COUNT(*) FILTER (WHERE i.kind = 'download')
           OR m."shareCount"    <> COUNT(*) FILTER (WHERE i.kind = 'share')
       LIMIT 20`,
    );
    assert.deepEqual(describeAll(drifted), [], 'interaction counts drifted');
  },
);

Then('no model has a negative or null interaction count', async function (this: ICustomWorld) {
  const bad = await query<{ id: string }>(
    this,
    `SELECT id FROM "Model"
     WHERE "viewCount" IS NULL OR "viewCount" < 0
        OR "runCount" IS NULL OR "runCount" < 0
        OR "downloadCount" IS NULL OR "downloadCount" < 0
        OR "shareCount" IS NULL OR "shareCount" < 0
     LIMIT 20`,
  );
  assert.deepEqual(
    bad.map((r) => r.id),
    [],
    'models with a negative or null count',
  );
});

Then('every model has exactly one owner', async function (this: ICustomWorld) {
  const bad = await query<{ id: string; owners: bigint }>(
    this,
    `SELECT m.id, COUNT(a.*) FILTER (WHERE a.role = 'owner') AS owners
     FROM "Model" m
     LEFT JOIN "ModelAuthor" a ON a."modelId" = m.id
     WHERE m."deletedAt" IS NULL
     GROUP BY m.id
     HAVING COUNT(a.*) FILTER (WHERE a.role = 'owner') <> 1
     LIMIT 20`,
  );
  assert.deepEqual(describeAll(bad), [], 'models without exactly one owner');
});

Then('no model has a duplicate collaborator for the same user', async function (this: ICustomWorld) {
  const bad = await query<{ modelId: string; userId: string; n: bigint }>(
    this,
    `SELECT "modelId", "userId", COUNT(*) AS n
     FROM "ModelAuthor"
     GROUP BY "modelId", "userId"
     HAVING COUNT(*) > 1
     LIMIT 20`,
  );
  assert.deepEqual(describeAll(bad), [], 'duplicate collaborators');
});

Then(
  'every collaborator row references a live user and a live model',
  async function (this: ICustomWorld) {
    const bad = await query<{ modelId: string; userId: string }>(
      this,
      `SELECT a."modelId", a."userId"
       FROM "ModelAuthor" a
       LEFT JOIN "Model" m ON m.id = a."modelId"
       LEFT JOIN "User"  u ON u.id = a."userId"
       WHERE m.id IS NULL OR u.id IS NULL OR u."deletedAt" IS NOT NULL
       LIMIT 20`,
    );
    assert.deepEqual(describeAll(bad), [], 'dangling collaborator rows');
  },
);
