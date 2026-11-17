import { describe, expect, it } from 'vitest';

import {
  isConnectionLevelSqlState,
  isReferencedRowViolation,
} from '#src/shared/db/prisma-error.map.ts';

describe('isReferencedRowViolation', () => {
  it('is true when a delete or update hits a row other rows still reference', () => {
    expect(
      isReferencedRowViolation(
        'update or delete on table "user" violates foreign key constraint "model_permission_user_id_fkey" on table "model_permission"',
      ),
    ).toBe(true);
  });

  it('is false when an insert or update points at a missing row', () => {
    expect(
      isReferencedRowViolation(
        'insert or update on table "model_permission" violates foreign key constraint "model_permission_user_id_fkey"',
      ),
    ).toBe(false);
  });

  it('is false without a message', () => {
    expect(isReferencedRowViolation(undefined)).toBe(false);
  });
});

describe('isConnectionLevelSqlState', () => {
  it.each(['08000', '08001', '08006', '57P01', '57P02', '57P03'])('is true for %s', (sqlState) => {
    expect(isConnectionLevelSqlState(sqlState)).toBe(true);
  });

  it.each(['42601', '23503', '57014', '57P04', ''])('is false for %s', (sqlState) => {
    expect(isConnectionLevelSqlState(sqlState)).toBe(false);
  });

  it('is false without a state', () => {
    expect(isConnectionLevelSqlState(undefined)).toBe(false);
  });
});
