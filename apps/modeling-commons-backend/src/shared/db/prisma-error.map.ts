import {
  ArgumentInvalidException,
  ConflictException,
  DatabaseErrorException,
  type ExceptionBase,
  NotFoundException,
  ServiceUnavailableException,
} from '#src/shared/exceptions/index.ts';

type ExceptionClass = new (message: string, cause?: Error, metadata?: unknown) => ExceptionBase;
type PrismaErrorRow = readonly [ExceptionClass, string];

function assignResponse(
  codes: ReadonlyArray<string>,
  response: PrismaErrorRow,
): Record<string, PrismaErrorRow> {
  return Object.fromEntries(codes.map((code) => [code, response]));
}
export const prismaErrorResponses = {
  invalidRequest: [ArgumentInvalidException, 'Invalid request'],
  conflict: [ConflictException, 'Conflict'],
  notFound: [NotFoundException, 'Not Found'],
  serviceUnavailable: [ServiceUnavailableException, 'Service Unavailable'],
  databaseError: [DatabaseErrorException, 'Internal Server Error'],
} as const satisfies Record<string, PrismaErrorRow>;

export const prismaErrorTable: Record<string, PrismaErrorRow> = {
  P2000: [ArgumentInvalidException, 'A value is too long.'],
  P2011: [ArgumentInvalidException, 'A required value is missing.'],
  P2020: [ArgumentInvalidException, 'A value is out of range.'],
  ...assignResponse(['P2007', 'P2023'], prismaErrorResponses.invalidRequest),
  ...assignResponse(['P2002', 'P2014', 'P2034'], prismaErrorResponses.conflict),
  ...assignResponse(['P2003', 'P2025', 'P2017', 'P2018'], prismaErrorResponses.notFound),
  ...assignResponse(['P1001', 'P1008', 'P1017', 'P2037'], prismaErrorResponses.serviceUnavailable),
};

const REFERENCED_ROW_VIOLATION_PREFIX = 'update or delete on table';
const CONNECTION_EXCEPTION_CLASS = '08';
const ADMIN_SHUTDOWN_STATES = new Set(['57P01', '57P02', '57P03']);

// Postgres reports SQLSTATE 23503 for both sides of a foreign key; only the server message says which.
export function isReferencedRowViolation(message: string | undefined): boolean {
  return message?.startsWith(REFERENCED_ROW_VIOLATION_PREFIX) ?? false;
}

export function isConnectionLevelSqlState(sqlState: string | undefined): boolean {
  if (!sqlState) return false;
  return sqlState.startsWith(CONNECTION_EXCEPTION_CLASS) || ADMIN_SHUTDOWN_STATES.has(sqlState);
}
