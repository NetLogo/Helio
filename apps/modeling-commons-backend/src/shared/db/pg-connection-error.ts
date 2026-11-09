import { trace } from '@opentelemetry/api';

import { type ExceptionBase, ServiceUnavailableException } from '#src/shared/exceptions/index.ts';

const CONNECTION_FAILURE_MESSAGES: ReadonlySet<string> = new Set([
  'timeout exceeded when trying to connect',
  'Connection terminated due to connection timeout',
  'Connection terminated unexpectedly',
  'Client has encountered a connection error and is not queryable',
]);

function isPgConnectionFailure(error: unknown): error is Error {
  return (
    error instanceof Error &&
    Object.getPrototypeOf(error) === Error.prototype &&
    !('code' in error) &&
    CONNECTION_FAILURE_MESSAGES.has(error.message)
  );
}

export function mapPgConnectionError(error: unknown): ExceptionBase | undefined {
  if (!isPgConnectionFailure(error)) return undefined;
  trace.getActiveSpan()?.setAttribute('db.pg.connection_error', error.message);
  return new ServiceUnavailableException('Service Unavailable', error, {
    pgMessage: error.message,
  });
}
