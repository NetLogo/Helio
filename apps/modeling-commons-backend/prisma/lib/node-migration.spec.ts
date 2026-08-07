import { describe, expect, test } from 'vitest';
import {
  createModelFromNode,
  mapVisibility,
  type ModelWriter,
  type NodeTree,
} from './node-migration.ts';
import type { LegacyAttachment, LegacyNode, LegacyTagging, LegacyVersion } from './legacy.ts';

const MODEL_UUID = '00000000-0000-4000-8000-000000000000';
const NOW = new Date('2030-01-01T00:00:00.000Z');
const SEP = '@#$#@#$#@';

function nlogo(version = 'NetLogo 5.0.4', info = 'the info tab'): string {
  return ['code', 'ui', info, 'shapes', version].join(SEP);
}

type Call = { method: string; args: unknown };

function recordingWriter() {
  const calls: Call[] = [];
  const record = (method: string) => (args: unknown) => {
    calls.push({ method, args });
    return Promise.resolve({});
  };
  const tx: ModelWriter = {
    model: { create: record('model.create'), update: record('model.update') },
    modelVersion: { create: record('modelVersion.create'), update: record('modelVersion.update') },
    modelAuthor: { create: record('modelAuthor.create') },
    modelAdditionalFile: { create: record('modelAdditionalFile.create') },
    modelVersionTag: { create: record('modelVersionTag.create') },
  };
  const dataFor = (method: string) =>
    calls.filter((c) => c.method === method).map((c) => (c.args as { data: unknown }).data);
  return { tx, calls, dataFor };
}

function deps(overrides: Partial<Parameters<typeof createModelFromNode>[3]> = {}) {
  const written = new Map<string, Buffer>();
  let counter = 0;
  return {
    written,
    value: {
      writeFile: async (relKey: string, contents: Buffer) => {
        written.set(relKey, contents);
      },
      newUuid: () => `uuid-${++counter}`,
      now: () => NOW,
      userIdByLegacyId: new Map<number, string>([
        [10, 'user-10'],
        [11, 'user-11'],
      ]),
      tagIdByLegacyId: new Map<number, string>([
        [100, 'tag-100'],
        [101, 'tag-101'],
      ]),
      ...overrides,
    },
  };
}

const node: LegacyNode = {
  id: 7921,
  name: 'Wolf Sheep',
  created_at: new Date('2020-05-04T10:00:00.000Z'),
  updated_at: new Date('2021-06-05T11:00:00.000Z'),
  visibility_id: 1,
};

function version(over: Partial<LegacyVersion> = {}): LegacyVersion {
  return {
    id: 1,
    node_id: node.id,
    person_id: 10,
    description: 'Initial upload',
    contents: nlogo(),
    created_at: new Date('2020-05-04T10:00:00.000Z'),
    updated_at: null,
    ...over,
  };
}

function attachment(over: Partial<LegacyAttachment> = {}): LegacyAttachment {
  return {
    id: 1,
    node_id: node.id,
    person_id: 10,
    filename: 'notes.txt',
    content_type: 'data',
    contents: Buffer.from('hello'),
    created_at: new Date('2020-07-01T00:00:00.000Z'),
    ...over,
  };
}

function tagging(over: Partial<LegacyTagging> = {}): LegacyTagging {
  return {
    id: 1,
    node_id: node.id,
    tag_id: 100,
    created_at: new Date('2020-08-01T00:00:00.000Z'),
    ...over,
  };
}

function tree(over: Partial<NodeTree> = {}): NodeTree {
  return { node, versions: [version()], attachments: [], taggings: [], ...over };
}

describe('mapVisibility', () => {
  test('1 is public, 2 and 3 are private', () => {
    expect(mapVisibility(1)).toBe('public');
    expect(mapVisibility(2)).toBe('private');
    expect(mapVisibility(3)).toBe('private');
  });

  test('unknown legacy visibility falls back to public', () => {
    expect(mapVisibility(99)).toBe('public');
  });
});

describe('createModelFromNode', () => {
  test('refuses a node with no versions', async () => {
    const { tx } = recordingWriter();
    await expect(
      createModelFromNode(tx, MODEL_UUID, tree({ versions: [] }), deps().value),
    ).rejects.toThrow(/no versions/i);
  });

  test('creates the model keyed on the legacy node id, never touching the uuid of anything else', async () => {
    const { tx, dataFor } = recordingWriter();
    await createModelFromNode(tx, MODEL_UUID, tree(), deps().value);

    expect(dataFor('model.create')[0]).toEqual({
      id: MODEL_UUID,
      legacyId: 7921,
      visibility: 'public',
      isEndorsed: false,
      createdAt: node.created_at,
      updatedAt: node.updated_at,
    });
  });

  test('falls back through created_at then now for missing timestamps', async () => {
    const { tx, dataFor } = recordingWriter();
    const bare = { ...node, created_at: null, updated_at: null };
    await createModelFromNode(tx, MODEL_UUID, tree({ node: bare }), deps().value);

    expect(dataFor('model.create')[0]).toMatchObject({ createdAt: NOW, updatedAt: NOW });
  });

  test('numbers versions 1..N in the order supplied and points latestVersionNumber at the last', async () => {
    const { tx, dataFor } = recordingWriter();
    const versions = [
      version({ id: 1, created_at: new Date('2020-01-01T00:00:00.000Z') }),
      version({ id: 2, created_at: new Date('2021-01-01T00:00:00.000Z') }),
      version({ id: 3, created_at: new Date('2022-01-01T00:00:00.000Z') }),
    ];
    const result = await createModelFromNode(tx, MODEL_UUID, tree({ versions }), deps().value);

    expect(
      dataFor('modelVersion.create').map((d) => (d as { versionNumber: number }).versionNumber),
    ).toEqual([1, 2, 3]);
    expect(dataFor('model.update')[0]).toEqual({ latestVersionNumber: 3 });
    expect(result.latestVersionNumber).toBe(3);
    expect(result.versions).toBe(3);
  });

  test('titles every version with the node name and parses metadata out of the contents', async () => {
    const { tx, dataFor } = recordingWriter();
    await createModelFromNode(tx, MODEL_UUID, tree(), deps().value);

    expect(dataFor('modelVersion.create')[0]).toMatchObject({
      modelId: MODEL_UUID,
      versionNumber: 1,
      title: 'Wolf Sheep',
      description: 'Initial upload',
      netlogoVersion: 'NetLogo 5.0.4',
      infoTab: 'the info tab',
      finalizedAt: version().created_at,
    });
  });

  test('an empty version description becomes null', async () => {
    const { tx, dataFor } = recordingWriter();
    await createModelFromNode(
      tx,
      MODEL_UUID,
      tree({ versions: [version({ description: '' })] }),
      deps().value,
    );

    expect(dataFor('modelVersion.create')[0]).toMatchObject({ description: null });
  });

  test('writes the version file under a key derived from the node name and detected format', async () => {
    const { tx, dataFor } = recordingWriter();
    const d = deps();
    await createModelFromNode(tx, MODEL_UUID, tree(), d.value);

    const key = (dataFor('modelVersion.create')[0] as { netlogoFileKey: string }).netlogoFileKey;
    expect(key).toBe(`uploads/models/${MODEL_UUID}/versions/2020/05/04/uuid-1/Wolf Sheep.nlogo`);
    expect(d.written.get(key)?.toString('utf8')).toBe(nlogo());
  });

  test('the first version author is the owner and later distinct authors are contributors', async () => {
    const { tx, dataFor } = recordingWriter();
    const versions = [
      version({ id: 1, person_id: 10 }),
      version({ id: 2, person_id: 11 }),
      version({ id: 3, person_id: 10 }),
    ];
    const result = await createModelFromNode(tx, MODEL_UUID, tree({ versions }), deps().value);

    expect(dataFor('modelAuthor.create')).toEqual([
      { modelId: MODEL_UUID, userId: 'user-10', role: 'owner', createdAt: versions[0]!.created_at },
      {
        modelId: MODEL_UUID,
        userId: 'user-11',
        role: 'contributor',
        createdAt: versions[1]!.created_at,
      },
    ]);
    expect(result.owners).toBe(1);
    expect(result.contributors).toBe(1);
  });

  test('an unmapped author is dropped rather than failing the node', async () => {
    const { tx, dataFor } = recordingWriter();
    const versions = [version({ id: 1, person_id: 999 }), version({ id: 2, person_id: 11 })];
    const result = await createModelFromNode(tx, MODEL_UUID, tree({ versions }), deps().value);

    expect(result.owners).toBe(0);
    expect(dataFor('modelAuthor.create')).toEqual([
      {
        modelId: MODEL_UUID,
        userId: 'user-11',
        role: 'contributor',
        createdAt: versions[1]!.created_at,
      },
    ]);
  });

  test('preview attachments land on the latest version and the last one by id wins', async () => {
    const { tx, calls, dataFor } = recordingWriter();
    const versions = [
      version({ id: 1 }),
      version({ id: 2, created_at: new Date('2021-01-01T00:00:00.000Z') }),
    ];
    const attachments = [
      attachment({ id: 5, content_type: 'preview', filename: 'first.png' }),
      attachment({ id: 6, content_type: 'preview', filename: 'second.png' }),
    ];
    const result = await createModelFromNode(
      tx,
      MODEL_UUID,
      tree({ versions, attachments }),
      deps().value,
    );

    const updates = calls.filter((c) => c.method === 'modelVersion.update');
    expect(updates).toHaveLength(2);
    expect(updates.at(-1)!.args).toMatchObject({
      where: { modelId_versionNumber: { modelId: MODEL_UUID, versionNumber: 2 } },
    });
    expect(
      (updates.at(-1)!.args as { data: { previewImageFileKey: string } }).data.previewImageFileKey,
    ).toContain('/second.png');
    expect(result.previewsAttached).toBe(2);
    expect(dataFor('modelAdditionalFile.create')).toEqual([]);
  });

  test('preview keys are public-read', async () => {
    const { tx, calls } = recordingWriter();
    const attachments = [attachment({ id: 5, content_type: 'preview', filename: 'p.png' })];
    await createModelFromNode(tx, MODEL_UUID, tree({ attachments }), deps().value);

    const update = calls.find((c) => c.method === 'modelVersion.update')!;
    expect(
      (update.args as { data: { previewImageFileKey: string } }).data.previewImageFileKey,
    ).toBe(`files/public/uploads/models/${MODEL_UUID}/preview-images/2020/07/01/uuid-2/p.png`);
  });

  test('non-preview attachments become additional files tagged to the latest version, with a metadata sidecar', async () => {
    const { tx, dataFor } = recordingWriter();
    const d = deps();
    const attachments = [attachment({ id: 5, filename: 'CTRNN.nls', content_type: 'extension' })];
    const result = await createModelFromNode(tx, MODEL_UUID, tree({ attachments }), d.value);

    const file = dataFor('modelAdditionalFile.create')[0] as {
      id: string;
      fileKey: string;
      taggedVersionNumber: number;
    };
    expect(file).toMatchObject({
      id: 'uuid-2',
      modelId: MODEL_UUID,
      taggedVersionNumber: 1,
      createdAt: attachments[0]!.created_at,
    });
    expect(file.fileKey).toBe(
      `uploads/models/${MODEL_UUID}/additionalFiles/2020/07/01/uuid-2/CTRNN.nls`,
    );
    expect(d.written.get(file.fileKey)?.toString()).toBe('hello');
    expect(JSON.parse(d.written.get(`${file.fileKey}.metadata.json`)!.toString())).toEqual({
      contentType: 'extension',
      originalFilename: 'CTRNN.nls',
      userId: 'user-10',
      createdAt: attachments[0]!.created_at!.toISOString(),
    });
    expect(result.attachments).toBe(1);
  });

  test('taggings land on the latest version, deduped, with unmapped tags skipped', async () => {
    const { tx, dataFor } = recordingWriter();
    const versions = [
      version({ id: 1 }),
      version({ id: 2, created_at: new Date('2021-01-01T00:00:00.000Z') }),
    ];
    const taggings = [
      tagging({ id: 1, tag_id: 100 }),
      tagging({ id: 2, tag_id: 100 }),
      tagging({ id: 3, tag_id: 101 }),
      tagging({ id: 4, tag_id: 999 }),
    ];
    const result = await createModelFromNode(
      tx,
      MODEL_UUID,
      tree({ versions, taggings }),
      deps().value,
    );

    expect(dataFor('modelVersionTag.create')).toEqual([
      {
        modelId: MODEL_UUID,
        versionNumber: 2,
        tagId: 'tag-100',
        createdAt: taggings[0]!.created_at,
      },
      {
        modelId: MODEL_UUID,
        versionNumber: 2,
        tagId: 'tag-101',
        createdAt: taggings[2]!.created_at,
      },
    ]);
    expect(result.taggings).toBe(2);
    expect(result.skippedOrphanTaggings).toBe(1);
  });
});
