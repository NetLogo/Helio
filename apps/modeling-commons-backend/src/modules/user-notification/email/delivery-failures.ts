import type { FastifyBaseLogger } from 'fastify';

export type FailureGroup = {
  results: ReadonlyArray<PromiseSettledResult<unknown>>;
  message: string;
};

export function handleFailedDeliveries(
  groups: ReadonlyArray<FailureGroup>,
  logger: Pick<FastifyBaseLogger, 'error'>,
  { name, summary }: { name: string; summary: string },
): void {
  const reasons: Array<unknown> = [];
  for (const { results, message } of groups) {
    for (const result of results) {
      if (result.status !== 'rejected') continue;
      logger.error({ name, message, error: result.reason });
      reasons.push(result.reason);
    }
  }
  if (reasons.length > 0) throw new AggregateError(reasons, summary);
}
