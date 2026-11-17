import { Prisma } from '#prisma/index';
import { trace, type Span } from '@opentelemetry/api';
import Fastify, { errorCodes } from 'fastify';
import type { FastifyInstance } from 'fastify';
import { Type } from 'typebox';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import errorHandlerPlugin from '#src/server/plugins/error-handler.ts';
import { NotFoundException } from '#src/shared/exceptions/index.ts';

function makeFastifyLikeError(code: string, statusCode: number): Error {
  return Object.assign(new Error('internal detail'), { code, statusCode });
}

function makePrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('internal detail', {
    code,
    clientVersion: '7.8.0',
    meta: { modelName: 'User', target: ['email'] },
  });
}

function expectedBody(statusCode: number, message: string, error: string) {
  return { statusCode, message, error, correlationId: expect.any(String) };
}

describe('errorHandlerPlugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ bodyLimit: 64 });
    await fastify.register(errorHandlerPlugin);
    fastify.post('/json', { schema: { body: Type.Object({ a: Type.String() }) } }, async () => ({
      ok: true,
    }));
    fastify.get('/throw/plain', async () => {
      throw new Error('internal detail');
    });
    fastify.get('/throw/client', async () => {
      throw makeFastifyLikeError('FST_SOMETHING', 429);
    });
    fastify.get('/throw/uncoded-client', async () => {
      throw Object.assign(new Error('internal detail'), { code: 429, statusCode: 429 });
    });
    fastify.get('/throw/below-client-range', async () => {
      throw makeFastifyLikeError('FST_SOMETHING', 302);
    });
    fastify.get('/throw/server', async () => {
      throw makeFastifyLikeError('FST_UNDER_PRESSURE', 503);
    });
    fastify.get('/throw/above-server-range', async () => {
      throw makeFastifyLikeError('FST_SOMETHING', 600);
    });
    fastify.get('/throw/file-too-large', async () => {
      throw makeFastifyLikeError('FST_REQ_FILE_TOO_LARGE', 413);
    });
    fastify.get('/throw/fastify-not-found', async () => {
      throw new errorCodes.FST_ERR_NOT_FOUND();
    });
    fastify.get('/throw/not-found-exception', async () => {
      throw new NotFoundException('Model not found');
    });
    fastify.get('/throw/pg-pool-timeout', async () => {
      throw new Error('timeout exceeded when trying to connect');
    });
    fastify.get<{ Params: { code: string } }>('/throw/prisma/:code', async (request) => {
      throw makePrismaError(request.params.code);
    });
    await fastify.ready();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fastify.close();
  });

  it('returns 400 with a fixed body for malformed JSON', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/json',
      headers: { 'content-type': 'application/json' },
      payload: '{bad',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(expectedBody(400, 'Bad Request', 'Bad Request'));
  });

  it('returns 413 with a fixed body for an oversized body', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/json',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ a: 'x'.repeat(200) }),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual(expectedBody(413, 'Payload Too Large', 'Payload Too Large'));
  });

  it('returns 415 with a fixed body for an unsupported content type', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/json',
      headers: { 'content-type': 'text/xml' },
      payload: '<a/>',
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual(
      expectedBody(415, 'Unsupported Media Type', 'Unsupported Media Type'),
    );
  });

  it('passes any coded 4xx through without leaking its message', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/client' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual(expectedBody(429, 'Too Many Requests', 'Too Many Requests'));
  });

  it('does not log coded 4xx errors at error level', async () => {
    const errorLog = vi.spyOn(fastify.log, 'error');

    await fastify.inject({ method: 'GET', url: '/throw/client' });

    expect(errorLog).not.toHaveBeenCalled();
  });

  it('keeps validation errors at 400 with subErrors', async () => {
    const response = await fastify.inject({ method: 'POST', url: '/json', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ...expectedBody(400, 'Validation error', 'Bad Request'),
      subErrors: JSON.stringify([{ path: '', message: "must have required property 'a'" }]),
    });
  });

  it('keeps the file too large message', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/file-too-large' });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual(
      expectedBody(413, 'File exceeds the maximum allowed size', 'Payload Too Large'),
    );
  });

  it('returns the Not Found body for the Fastify not found error', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/fastify-not-found' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(expectedBody(404, 'Not Found', 'Not Found'));
  });

  it('keeps the status of a coded 5xx without leaking its message', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/server' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual(
      expectedBody(503, 'Service Unavailable', 'Service Unavailable'),
    );
  });

  it('logs coded 5xx errors at error level', async () => {
    const errorLog = vi.spyOn(fastify.log, 'error');

    await fastify.inject({ method: 'GET', url: '/throw/server' });

    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ code: 'FST_UNDER_PRESSURE' }));
  });

  it('returns 500 for a coded error at or above 600', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/above-server-range' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(
      expectedBody(500, 'Internal Server Error', 'Internal Server Error'),
    );
  });

  it('returns 500 for a 4xx error without a string code', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/uncoded-client' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(
      expectedBody(500, 'Internal Server Error', 'Internal Server Error'),
    );
  });

  it('returns 500 for a coded error below 400', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/below-client-range' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(
      expectedBody(500, 'Internal Server Error', 'Internal Server Error'),
    );
  });

  it('returns 500 for a plain error', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/plain' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(
      expectedBody(500, 'Internal Server Error', 'Internal Server Error'),
    );
  });

  it('returns the status and message of an ExceptionBase', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/throw/not-found-exception' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(expectedBody(404, 'Model not found', 'Not Found'));
  });

  it.each([
    ['P2002', 409, 'Conflict', 'Conflict'],
    ['P2003', 404, 'Not Found', 'Not Found'],
    ['P2025', 404, 'Not Found', 'Not Found'],
    ['P2000', 400, 'A value is too long.', 'Bad Request'],
    ['P1001', 503, 'Service Unavailable', 'Service Unavailable'],
    ['P2009', 500, 'Internal Server Error', 'Internal Server Error'],
  ])('returns %s as %i with a generic body', async (code, statusCode, message, error) => {
    const response = await fastify.inject({ method: 'GET', url: `/throw/prisma/${code}` });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toStrictEqual(expectedBody(statusCode, message, error));
  });

  it('sets db.prisma.code on the active span for a Prisma error', async () => {
    const setAttribute = vi.fn();
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue({ setAttribute } as unknown as Span);

    await fastify.inject({ method: 'GET', url: '/throw/prisma/P2025' });

    expect(setAttribute).toHaveBeenCalledWith('db.prisma.code', 'P2025');
  });

  it('logs a mapped Prisma 4xx below error level', async () => {
    const errorLog = vi.spyOn(fastify.log, 'error');

    await fastify.inject({ method: 'GET', url: '/throw/prisma/P2002' });

    expect(errorLog).not.toHaveBeenCalled();
  });

  it('logs a mapped Prisma 5xx at error level with its code, meta and correlation id', async () => {
    const errorLog = vi.spyOn(fastify.log, 'error');

    await fastify.inject({ method: 'GET', url: '/throw/prisma/P2009' });

    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        metadata: { prismaCode: 'P2009', meta: { modelName: 'User', target: ['email'] } },
      }),
    );
  });

  it('returns a codeless pg connection failure as 503 and logs it at error level', async () => {
    const errorLog = vi.spyOn(fastify.log, 'error');

    const response = await fastify.inject({ method: 'GET', url: '/throw/pg-pool-timeout' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toStrictEqual(
      expectedBody(503, 'Service Unavailable', 'Service Unavailable'),
    );
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        metadata: { pgMessage: 'timeout exceeded when trying to connect' },
      }),
    );
  });
});
