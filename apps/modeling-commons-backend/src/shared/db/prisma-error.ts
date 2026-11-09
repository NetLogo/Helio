import { Prisma } from '#prisma/index';
import { trace } from '@opentelemetry/api';

import {
  isConnectionLevelSqlState,
  isReferencedRowViolation,
  prismaErrorResponses,
  prismaErrorTable,
} from '#src/shared/db/prisma-error.map.ts';
import type { ExceptionBase } from '#src/shared/exceptions/index.ts';

function isPrismaError(error: unknown): error is Error {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientValidationError
  );
}

function readPrismaCode(error: Error): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode;
  return undefined;
}

function readDriverCause(
  meta: Record<string, unknown> | undefined,
  field: 'originalMessage' | 'originalCode',
): string | undefined {
  const adapterError = meta?.['driverAdapterError'];
  if (typeof adapterError !== 'object' || adapterError === null || !('cause' in adapterError)) {
    return undefined;
  }
  const { cause } = adapterError;
  if (typeof cause !== 'object' || cause === null || !(field in cause)) return undefined;
  const value: unknown = (cause as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

function selectRow(code: string | undefined, meta: Record<string, unknown> | undefined) {
  if (code === 'P2003' && isReferencedRowViolation(readDriverCause(meta, 'originalMessage'))) {
    return prismaErrorResponses.conflict;
  }
  if (code === 'P2010' && isConnectionLevelSqlState(readDriverCause(meta, 'originalCode'))) {
    return prismaErrorResponses.serviceUnavailable;
  }
  return (
    (code === undefined ? undefined : prismaErrorTable[code]) ?? prismaErrorResponses.databaseError
  );
}

export function mapPrismaError(error: unknown): ExceptionBase | undefined {
  if (!isPrismaError(error)) return undefined;
  const prismaCode = readPrismaCode(error);
  const meta = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined;
  if (prismaCode) trace.getActiveSpan()?.setAttribute('db.prisma.code', prismaCode);
  const [Exception, message] = selectRow(prismaCode, meta);
  return new Exception(message, error, { prismaCode, meta });
}
