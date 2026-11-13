import { trace, type Span } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapPgConnectionError } from '#src/shared/db/pg-connection-error.ts';
import { ServiceUnavailableException } from '#src/shared/exceptions/index.ts';

describe('mapPgConnectionError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'timeout exceeded when trying to connect',
    'Connection terminated due to connection timeout',
    'Connection terminated unexpectedly',
    'Client has encountered a connection error and is not queryable',
  ])('maps "%s" to a generic 503 that keeps the cause', (message) => {
    const error = new Error(message);

    const exception = mapPgConnectionError(error);

    expect(exception).toBeInstanceOf(ServiceUnavailableException);
    expect(exception?.message).toBe('Service Unavailable');
    expect(exception?.cause).toBe(error);
    expect(exception?.metadata).toEqual({ pgMessage: message });
  });

  it('sets db.pg.connection_error on the active span', () => {
    const setAttribute = vi.fn();
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({ setAttribute } as unknown as Span);

    mapPgConnectionError(new Error('Connection terminated unexpectedly'));

    expect(setAttribute).toHaveBeenCalledWith(
      'db.pg.connection_error',
      'Connection terminated unexpectedly',
    );
  });

  it.each([
    ['an unrelated message', new Error('Connection refused by policy')],
    ['a message that only contains a known one', new Error('xConnection terminated unexpectedly')],
    [
      'a coded error with a known message',
      Object.assign(new Error('Connection terminated unexpectedly'), { code: 'FST_X' }),
    ],
    ['an Error subclass with a known message', new TypeError('Connection terminated unexpectedly')],
    ['a non-error value', 'Connection terminated unexpectedly'],
  ])('ignores %s', (_, error) => {
    expect(mapPgConnectionError(error)).toBeUndefined();
  });
});
