import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAPPED_TABLES } from './catalog.ts';

const schema = readFileSync(new URL('../../schema.prisma', import.meta.url), 'utf8');

function modelsWithGeneratedId(source: string): Array<string> {
  return [...source.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
    .filter(([, , body]) => /^\s*id\s+String\s+@id\s+@default\(nanoid\(\)\)/m.test(body ?? ''))
    .map(([, name]) => name ?? '');
}

describe('MAPPED_TABLES', () => {
  it('lists exactly the schema models whose primary key is a generated id', () => {
    expect([...MAPPED_TABLES].sort()).toEqual(modelsWithGeneratedId(schema).sort());
  });
});
