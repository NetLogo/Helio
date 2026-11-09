import { Prisma } from '#prisma/index';
import { describe, expect, it, vi } from 'vitest';

import makeRepositoryBase from '#src/shared/db/repository-base.factory.ts';
import {
  ConflictException,
  DatabaseErrorException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

type Thing = { id: string };

function makePrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: '7.8.0',
  });
}

function makeDelegate() {
  return {
    create: vi.fn().mockResolvedValue({ id: 't1' }),
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue({ id: 't1' }),
    delete: vi.fn().mockResolvedValue({ id: 't1' }),
  };
}

function makeRepository(delegate: ReturnType<typeof makeDelegate>) {
  return makeRepositoryBase({ db: { thing: delegate } })<Thing, Thing>({
    tableName: 'thing',
    mapper: {
      toPersistence: (entity) => entity,
      toDomain: (record) => record,
      toResponse: (entity) => entity,
    },
  });
}

describe('repositoryBase', () => {
  it('maps a unique violation on insert to ConflictException', async () => {
    const delegate = makeDelegate();
    delegate.create.mockRejectedValue(makePrismaError('P2002'));

    await expect(makeRepository(delegate).insert({ id: 't1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('wraps a non-Prisma insert failure in DatabaseErrorException', async () => {
    const delegate = makeDelegate();
    delegate.create.mockRejectedValue(new Error('socket hang up'));

    const failure = makeRepository(delegate).insert({ id: 't1' });

    await expect(failure).rejects.toBeInstanceOf(DatabaseErrorException);
    await expect(failure).rejects.toMatchObject({
      message: 'Internal Server Error',
      metadata: { operation: 'insert thing' },
    });
  });

  it('maps a missing record on update to NotFoundException', async () => {
    const delegate = makeDelegate();
    delegate.update.mockRejectedValue(makePrismaError('P2025'));

    await expect(makeRepository(delegate).update({ id: 't1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the mapped entity on update', async () => {
    const delegate = makeDelegate();

    await expect(makeRepository(delegate).update({ id: 't1' })).resolves.toEqual({ id: 't1' });
  });

  it('returns true when delete removes the record', async () => {
    await expect(makeRepository(makeDelegate()).delete('t1')).resolves.toBe(true);
  });

  it('returns false when delete finds no record', async () => {
    const delegate = makeDelegate();
    delegate.delete.mockRejectedValue(makePrismaError('P2025'));

    await expect(makeRepository(delegate).delete('t1')).resolves.toBe(false);
  });

  it('throws DatabaseErrorException when delete loses the connection', async () => {
    const delegate = makeDelegate();
    delegate.delete.mockRejectedValue(new Error('Connection terminated unexpectedly'));

    await expect(makeRepository(delegate).delete('t1')).rejects.toBeInstanceOf(
      DatabaseErrorException,
    );
  });
});
