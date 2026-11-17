import { Type } from 'typebox';
import { describe, it, expect } from 'vitest';

import { ajv } from '#src/shared/utils/validator.util.ts';

import { ID_LENGTH, ID_PATTERN, ID_EXAMPLE, newId, idSchema } from '#src/shared/utils/id.ts';

describe('id format and schema', () => {
  it('ID_EXAMPLE matches ID_PATTERN', () => {
    expect(ID_EXAMPLE).toMatch(new RegExp(ID_PATTERN));
  });

  it('ID_PATTERN generates a valid regex pattern', () => {
    const regex = new RegExp(ID_PATTERN);
    expect(regex.test('A1b2C3d4E5f6G7h8I9j0K')).toBe(true); // valid ID
    expect(regex.test('invalid-id!')).toBe(false); // invalid ID
  });

  it('newId generates a valid ID', () => {
    const id = newId();
    expect(id).toMatch(new RegExp(ID_PATTERN));
    expect(id.length).toBe(ID_LENGTH);
  });

  it('newId generates 10_000 unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(newId());
    }
    expect(ids.size).toBe(10_000);
  });

  it('idSchema returns a valid schema object', () => {
    const schema = idSchema('Test ID');
    expect(schema.type).toBe('string');
  });

  it('ajv validates the schema correctly', () => {
    const validIds = ['A1b2C3d4E5f6G7h8I9j0K', 'Z9y8X7w6V5u4T3s2R1q0P'];
    const invalidIds = ['invalid-id!', '123', 'A1b2C3d4E5f6G7h8I9j0K!', '', undefined];

    const objectSchema = Type.Object({
      id: idSchema('Test ID'),
    });

    ajv.addKeyword('example');
    const validate = (data: unknown): boolean => {
      const validateFn = ajv.compile(objectSchema);
      return validateFn(data) as boolean;
    };

    for (const id of validIds) {
      const fakeValidData = { id };
      expect(validate(fakeValidData)).toBe(true);
    }

    for (const id of invalidIds) {
      const fakeInvalidData = { id };
      expect(validate(fakeInvalidData)).toBe(false);
    }
  });
});
