import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import {
  type ApiErrorResponse,
  apiErrorResponseSchema,
} from '#src/shared/api/api-error.response.ts';
import { getRequestId } from '#src/shared/app/app-request-context.ts';
import { mapPgConnectionError } from '#src/shared/db/pg-connection-error.ts';
import { mapPrismaError } from '#src/shared/db/prisma-error.ts';
import { ExceptionBase } from '#src/shared/exceptions/index.ts';

const fastifyErrorCodesMap: Record<
  string,
  | ((error: FastifyError) => {
      statusCode: number;
      message: string;
      error: string;
      correlationId?: string;
      subErrors?: string;
    })
  | undefined
> = {
  FST_ERR_VALIDATION: (error: FastifyError) => ({
    subErrors: JSON.stringify(
      (error.validation ?? []).map((validationError) => ({
        path: validationError.instancePath,
        message: validationError.message ?? '',
      })),
    ),
    statusCode: 400,
    message: 'Validation error',
    error: 'Bad Request', // https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1
  }),
  FST_REQ_FILE_TOO_LARGE: () => ({
    message: 'File exceeds the maximum allowed size',
    error: 'Payload Too Large',
    statusCode: 413, // https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.11
  }),
};

function isCodedHttpError(error: Error): error is Error & { code: string; statusCode: number } {
  return (
    'code' in error &&
    typeof error.code === 'string' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  );
}

function sendException(res: FastifyReply, exception: ExceptionBase) {
  return res.status(exception.statusCode).send({
    statusCode: exception.statusCode,
    message: exception.message,
    error: exception.error,
    correlationId: getRequestId(),
  } satisfies ApiErrorResponse);
}

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | Error, _, res) => {
    // Handle fastify errors
    if ('code' in error) {
      const fastifyError = fastifyErrorCodesMap[error.code];
      if (fastifyError) {
        const response = fastifyError(error);
        response.correlationId = getRequestId();
        return res.status(response.statusCode).send(response);
      }
    }

    if (isCodedHttpError(error)) {
      const isServerError = error.statusCode >= 500;
      if (isServerError) fastify.log.error(error);
      else fastify.log.debug(error);
      const statusText =
        STATUS_CODES[error.statusCode] ?? (isServerError ? 'Internal Server Error' : 'Bad Request');
      return res.status(error.statusCode).send({
        statusCode: error.statusCode,
        message: statusText,
        error: statusText,
        correlationId: getRequestId(),
      } satisfies ApiErrorResponse);
    }

    const databaseException = mapPrismaError(error) ?? mapPgConnectionError(error);
    if (databaseException) {
      if (databaseException.statusCode < 500) fastify.log.debug(databaseException);
      else fastify.log.error(databaseException);
      return sendException(res, databaseException);
    }

    fastify.log.error(error);
    if (error instanceof ExceptionBase) {
      return sendException(res, error);
    }

    return res.status(500).send({
      statusCode: 500,
      message: 'Internal Server Error', // https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1
      error: 'Internal Server Error',
      correlationId: getRequestId(),
    } satisfies ApiErrorResponse);
  });

  // Add the ExceptionResponse schema to the fastify instance
  fastify.addSchema(apiErrorResponseSchema);

  // Add global error schema
  fastify.addHook('onRoute', (routeOptions) => {
    // Initialize schema and response objects if they don't exist
    routeOptions.schema = routeOptions.schema ?? {};
    routeOptions.schema.response = routeOptions.schema.response ?? {};

    // @ts-expect-error - Not typed
    const errorRef = { $ref: `${apiErrorResponseSchema.$id}#` };

    // Automatically add error definitions if not already explicitly defined
    const defaultErrors = [400, 401, 403, 404, 500];

    defaultErrors.forEach((code) => {
      routeOptions.schema ??= {};
      routeOptions.schema.response ??= {};
      // @ts-expect-error - Not typed
      routeOptions.schema.response[code] ??= errorRef;
    });
  });
}

// Export the plugin
export default fp(errorHandlerPlugin, {
  name: 'errorHandler',
});
