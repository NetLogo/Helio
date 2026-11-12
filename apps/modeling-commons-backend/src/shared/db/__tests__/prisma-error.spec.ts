import { Prisma } from '#prisma/index';
import { trace, type Span } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapPrismaError, rethrowUniqueViolation } from '#src/shared/db/prisma-error.ts';
import {
  ArgumentInvalidException,
  ConflictException,
  DatabaseErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '#src/shared/exceptions/index.ts';

function makeKnownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: '7.8.0',
    meta,
  });
}

function makeForeignKeyMeta(originalMessage: string) {
  return {
    modelName: 'ModelPermission',
    driverAdapterError: {
      name: 'DriverAdapterError',
      cause: { kind: 'ForeignKeyConstraintViolation', originalCode: '23503', originalMessage },
    },
  };
}

const INSERT_VIOLATION =
  'insert or update on table "model_permission" violates foreign key constraint "model_permission_user_id_fkey"';
const DELETE_VIOLATION =
  'update or delete on table "user" violates foreign key constraint "model_permission_user_id_fkey" on table "model_permission"';

describe('mapPrismaError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['P2000', ArgumentInvalidException, 400, 'A value is too long.'],
    ['P2011', ArgumentInvalidException, 400, 'A required value is missing.'],
    ['P2020', ArgumentInvalidException, 400, 'A value is out of range.'],
    ['P2007', ArgumentInvalidException, 400, 'Invalid request'],
    ['P2023', ArgumentInvalidException, 400, 'Invalid request'],
    ['P2002', ConflictException, 409, 'Conflict'],
    ['P2014', ConflictException, 409, 'Conflict'],
    ['P2034', ConflictException, 409, 'Conflict'],
    ['P2003', NotFoundException, 404, 'Not Found'],
    ['P2025', NotFoundException, 404, 'Not Found'],
    ['P2017', NotFoundException, 404, 'Not Found'],
    ['P2018', NotFoundException, 404, 'Not Found'],
    ['P1001', ServiceUnavailableException, 503, 'Service Unavailable'],
    ['P1008', ServiceUnavailableException, 503, 'Service Unavailable'],
    ['P1017', ServiceUnavailableException, 503, 'Service Unavailable'],
    ['P2037', ServiceUnavailableException, 503, 'Service Unavailable'],
    ['P2009', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2012', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1000', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1003', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1009', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1010', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1011', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P1018', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2010', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2021', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2022', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2028', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2029', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2030', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2036', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P2038', DatabaseErrorException, 500, 'Internal Server Error'],
    ['P9999', DatabaseErrorException, 500, 'Internal Server Error'],
  ])('maps %s to %O with status %i', (code, exceptionClass, statusCode, message) => {
    const mapped = mapPrismaError(makeKnownError(code));

    expect(mapped).toBeInstanceOf(exceptionClass);
    expect(mapped?.statusCode).toBe(statusCode);
    expect(mapped?.message).toBe(message);
  });

  it('maps P2003 raised on insert or update to 404', () => {
    const mapped = mapPrismaError(makeKnownError('P2003', makeForeignKeyMeta(INSERT_VIOLATION)));

    expect(mapped).toBeInstanceOf(NotFoundException);
  });

  it('maps P2003 raised on delete of a referenced row to 409', () => {
    const mapped = mapPrismaError(makeKnownError('P2003', makeForeignKeyMeta(DELETE_VIOLATION)));

    expect(mapped).toBeInstanceOf(ConflictException);
    expect(mapped?.message).toBe('Conflict');
  });

  it('keeps the Prisma code and meta in metadata and the error as cause', () => {
    const meta = { modelName: 'User', target: ['email'] };
    const error = makeKnownError('P2002', meta);

    const mapped = mapPrismaError(error);

    expect(mapped?.metadata).toEqual({ prismaCode: 'P2002', meta });
    expect(mapped?.cause).toBe(error);
  });

  it('sets db.prisma.code on the active span', () => {
    const setAttribute = vi.fn();
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({ setAttribute } as unknown as Span);

    mapPrismaError(makeKnownError('P2025'));

    expect(setAttribute).toHaveBeenCalledWith('db.prisma.code', 'P2025');
  });

  it('maps a codeless Prisma error to a 500 DatabaseErrorException', () => {
    const error = new Prisma.PrismaClientUnknownRequestError('engine failure', {
      clientVersion: '7.8.0',
    });

    const mapped = mapPrismaError(error);

    expect(mapped).toBeInstanceOf(DatabaseErrorException);
    expect(mapped?.statusCode).toBe(500);
    expect(mapped?.metadata).toEqual({ prismaCode: undefined, meta: undefined });
  });

  it('returns undefined for a non-Prisma error carrying a Prisma code', () => {
    expect(mapPrismaError(Object.assign(new Error('boom'), { code: 'P2002' }))).toBeUndefined();
  });

  it('returns undefined for a non-error value', () => {
    expect(mapPrismaError({ code: 'P2002' })).toBeUndefined();
  });

  it.each(['08006', '08001', '57P01', '57P02', '57P03'])(
    'answers 503 when the server drops the connection (SQLSTATE %s)',
    (originalCode) => {
      const mapped = mapPrismaError(
        makeKnownError('P2010', {
          driverAdapterError: {
            name: 'DriverAdapterError',
            cause: { kind: 'postgres', originalCode },
          },
        }),
      );
      expect(mapped).toBeInstanceOf(ServiceUnavailableException);
      expect(mapped?.statusCode).toBe(503);
    },
  );

  it('keeps other raw query failures at 500', () => {
    const mapped = mapPrismaError(
      makeKnownError('P2010', {
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: { kind: 'postgres', originalCode: '42601' },
        },
      }),
    );
    expect(mapped).toBeInstanceOf(DatabaseErrorException);
  });
});

describe('rethrowUniqueViolation', () => {
  it('replaces a unique violation with the given error', async () => {
    const replacement = new Error('already exists');

    await expect(
      rethrowUniqueViolation(Promise.reject(makeKnownError('P2002')), () => replacement),
    ).rejects.toBe(replacement);
  });

  it('rethrows any other error unchanged', async () => {
    const error = makeKnownError('P2003');

    await expect(
      rethrowUniqueViolation(Promise.reject(error), () => new Error('already exists')),
    ).rejects.toBe(error);
  });

  it('resolves with the value of a successful operation', async () => {
    await expect(
      rethrowUniqueViolation(Promise.resolve('ok'), () => new Error('already exists')),
    ).resolves.toBe('ok');
  });
});
