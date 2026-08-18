import { describe, expect, it } from 'vitest';
import { isCurrentId, remapJson, remapString } from './rewrite.ts';

const OLD_USER = '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231';
const NEW_USER = 'V1StGXR8Z5jdHi6BmyT8C';
const OLD_MODEL = '9f1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d';
const NEW_MODEL = 'kR7pQzWmN3xLbT5vHc2Ya';
const OLD_DRAFT = 'cm9z1k2l3m4n5o6p7q8r9s0t';
const NEW_DRAFT = 'Dq8sVn4TzB1yGh6WrK0Lm';

const map = new Map([
  [OLD_USER, NEW_USER],
  [OLD_MODEL, NEW_MODEL],
  [OLD_DRAFT, NEW_DRAFT],
]);

describe('remapString', () => {
  it('replaces a value that is exactly a mapped id', () => {
    expect(remapString(OLD_USER, map)).toBe(NEW_USER);
  });

  it('leaves an unmapped value alone', () => {
    expect(remapString('7b3e1f20-0000-4000-8000-000000000000', map)).toBe(
      '7b3e1f20-0000-4000-8000-000000000000',
    );
  });

  it('replaces an id embedded as a storage key segment', () => {
    expect(remapString(`uploads/models/${OLD_MODEL}/versions/2026/08/13/AbCdEfGhIj/m.nlogox`, map)).toBe(
      `uploads/models/${NEW_MODEL}/versions/2026/08/13/AbCdEfGhIj/m.nlogox`,
    );
  });

  it('replaces an id inside a public asset URL', () => {
    expect(
      remapString(`http://127.0.0.1:41090/commons/files/public/avatars/${OLD_USER}/2026/08/13/x/a.png`, map),
    ).toBe(`http://127.0.0.1:41090/commons/files/public/avatars/${NEW_USER}/2026/08/13/x/a.png`);
  });

  it('replaces both ids in a staging key without touching the fused filename segment', () => {
    expect(remapString(`staging/${OLD_USER}/${OLD_DRAFT}/AbCdEfGhIj-wolf-sheep.nlogox`, map)).toBe(
      `staging/${NEW_USER}/${NEW_DRAFT}/AbCdEfGhIj-wolf-sheep.nlogox`,
    );
  });

  // storagePathHash deliberately keeps its UUID shape and is not a row id, so
  // matching by shape rather than by map membership would orphan every legacy
  // object it names.
  it('leaves a uuid-shaped storagePathHash segment alone', () => {
    const key = `uploads/models/${OLD_MODEL}/versions/2026/08/13/fb60fd65-f24f-42c7-bb9f-9c794f021ae4/f.nlogo`;
    expect(remapString(key, map)).toBe(key.replace(OLD_MODEL, NEW_MODEL));
  });

  it('leaves a filename that merely resembles an id alone', () => {
    expect(remapString('uploads/models/x/wolf-sheep-predation.nlogo', map)).toBe(
      'uploads/models/x/wolf-sheep-predation.nlogo',
    );
  });
});

describe('remapJson', () => {
  it('remaps strings nested in objects and arrays', () => {
    const data = {
      title: 'Wolf Sheep Predation',
      primaryFile: { s3Key: `staging/${OLD_USER}/${OLD_DRAFT}/AbCdEfGhIj-m.nlogox` },
      attachments: [{ id: 'x', s3Key: `staging/${OLD_USER}/${OLD_DRAFT}/JkLmNoPqRs-a.csv` }],
      ownerId: OLD_USER,
      count: 3,
      missing: null,
    };

    expect(remapJson(data, map)).toEqual({
      title: 'Wolf Sheep Predation',
      primaryFile: { s3Key: `staging/${NEW_USER}/${NEW_DRAFT}/AbCdEfGhIj-m.nlogox` },
      attachments: [{ id: 'x', s3Key: `staging/${NEW_USER}/${NEW_DRAFT}/JkLmNoPqRs-a.csv` }],
      ownerId: NEW_USER,
      count: 3,
      missing: null,
    });
  });

  it('remaps an object key that is exactly a mapped id', () => {
    expect(remapJson({ [OLD_MODEL]: { seen: true } }, map)).toEqual({ [NEW_MODEL]: { seen: true } });
  });
});

describe('isCurrentId', () => {
  it('accepts a nanoid and rejects the shapes it replaces', () => {
    expect(isCurrentId(NEW_USER)).toBe(true);
    expect(isCurrentId(OLD_USER)).toBe(false);
    expect(isCurrentId(OLD_DRAFT)).toBe(false);
  });
});
