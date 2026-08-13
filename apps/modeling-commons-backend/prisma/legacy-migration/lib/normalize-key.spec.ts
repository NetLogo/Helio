import { describe, expect, test } from 'vitest';
import { normalizeKey } from './normalize-key.ts';

const MODEL_ID_A = 'abcdefghij0123456789A'; // 21 chars
const MODEL_ID_B = 'ZYXWVUTSRQ9876543210z'; // 21 chars
const FILE_ID = 'fileZfileZfileZfileZf'; // 21 chars, held constant across a/b
const NANOID10_A = 'AbCdEfGhIj';
const NANOID10_B = '9zY8xW7vU6';
const USER_ID = 'userU1serU1serU1serU1'; // 21 chars
const DRAFT_ID = 'draftDRAFTdraftDRAFTd'; // 21 chars

describe('normalizeKey', () => {
  test('collapses a bare nanoid(21) model id segment', () => {
    const a = `uploads/models/${MODEL_ID_A}/versions/2020/05/04/${FILE_ID}/x.nlogo`;
    const b = `uploads/models/${MODEL_ID_B}/versions/2020/05/04/${FILE_ID}/x.nlogo`;
    expect(normalizeKey(a)).toBe(normalizeKey(b));
  });

  test('collapses a bare nanoid(10) createStorageKey segment', () => {
    const a = `uploads/models/2024/06/25/${NANOID10_A}/my_model.png`;
    const b = `uploads/models/2024/06/25/${NANOID10_B}/my_model.png`;
    expect(normalizeKey(a)).toBe(normalizeKey(b));
  });

  test('collapses the id prefix of a stagingKey fused nanoid(10)-filename segment', () => {
    const a = `staging/${USER_ID}/${DRAFT_ID}/${NANOID10_A}-my_model.png`;
    const b = `staging/${USER_ID}/${DRAFT_ID}/${NANOID10_B}-my_model.png`;
    expect(normalizeKey(a)).toBe(normalizeKey(b));
  });

  test('collapses a legacy pre-migration hex-hyphenated id segment', () => {
    const a = 'uploads/models/11111111-1111-4111-8111-111111111111/versions/2020/05/04/f/x.nlogo';
    const b = 'uploads/models/22222222-2222-4222-8222-222222222222/versions/2020/05/04/f/x.nlogo';
    expect(normalizeKey(a)).toBe(normalizeKey(b));
  });

  test('collapses the frozen storagePathHash segment', () => {
    const a = 'uploads/models/m/versions/2020/05/04/fb60fd65-f24f-42c7-bb9f-9c794f021ae4/x.nlogo';
    const b = 'uploads/models/m/versions/2020/05/04/6817b950-1dca-4c97-aee6-5fafbb910a24/x.nlogo';
    expect(normalizeKey(a)).toBe(normalizeKey(b));
  });

  test('does not collapse a real path component that differs', () => {
    const a = `uploads/models/${MODEL_ID_A}/versions/2020/05/04/f/x.nlogo`;
    const b = `uploads/models/${MODEL_ID_A}/preview-images/2020/05/04/f/x.nlogo`;
    expect(normalizeKey(a)).not.toBe(normalizeKey(b));
  });

  test('does not collapse a filename that differs', () => {
    const a = `uploads/models/${MODEL_ID_A}/versions/2020/05/04/${NANOID10_A}/a.nlogo`;
    const b = `uploads/models/${MODEL_ID_A}/versions/2020/05/04/${NANOID10_A}/b.nlogo`;
    expect(normalizeKey(a)).not.toBe(normalizeKey(b));
  });

  test('does not collapse a stagingKey filename that differs, only its id prefix', () => {
    const a = `staging/${USER_ID}/${DRAFT_ID}/${NANOID10_A}-first.png`;
    const b = `staging/${USER_ID}/${DRAFT_ID}/${NANOID10_A}-second.png`;
    expect(normalizeKey(a)).not.toBe(normalizeKey(b));
  });
});

describe('normalizeKey does not eat real filenames', () => {
  it('leaves a hyphenated filename whose first ten characters precede a dash', () => {
    const key = 'uploads/models/m/preview-images/2020/07/01/AbCdEfGhIj/wolf-sheep-predation.nlogo';
    expect(normalizeKey(key)).toBe('uploads/models/m/preview-images/2020/07/01/<id>/wolf-sheep-predation.nlogo');
  });

  it('keeps two different filenames distinguishable under the same id segment', () => {
    const base = 'uploads/models/m/additionalFiles/2020/07/01/AbCdEfGhIj/';
    expect(normalizeKey(`${base}wolf-sheep-predation.nlogo`)).not.toBe(
      normalizeKey(`${base}Xy1Z_aBcDe-predation.nlogo`),
    );
  });

  it('leaves an extensionless final segment of id length alone', () => {
    expect(normalizeKey('uploads/models/m/files/2020/07/01/AbCdEfGhIj/abcdefghij')).toBe(
      'uploads/models/m/files/2020/07/01/<id>/abcdefghij',
    );
  });

  it('still strips the fused prefix inside a staging key', () => {
    expect(normalizeKey('staging/u/d/AbCdEfGhIj-wolf-sheep.nlogox')).toBe('staging/u/d/<id>-wolf-sheep.nlogox');
  });
});
