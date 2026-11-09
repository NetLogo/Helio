import type { EventDispatch, EventDispatchState } from '#src/modules/event/domain/event.types.ts';
import type { JobStateRow } from '#src/shared/jobs/job-queue.port.ts';

export type DispatchSubscriber = {
  subscriber: string;
  queueName: string;
  deadLetterQueueName: string;
};

function readErrorMessage(output: unknown): string | null {
  if (typeof output !== 'object' || output === null) return null;
  const { message } = output as { message?: unknown };
  return typeof message === 'string' ? message : null;
}

function countAttempts(row: JobStateRow): number {
  return row.state === 'created' ? row.retryCount : row.retryCount + 1;
}

function summarizeSubscriberDispatch(
  { subscriber, queueName, deadLetterQueueName }: DispatchSubscriber,
  rows: ReadonlyArray<JobStateRow>,
): EventDispatch | undefined {
  const live = rows.find((row) => row.queue === queueName);
  const dead = rows.find((row) => row.queue === deadLetterQueueName);
  const latest = dead ?? live;
  if (!latest) return undefined;

  return {
    subscriber,
    state: dead ? 'dead' : (latest.state as EventDispatchState),
    attempts: live ? countAttempts(live) : null,
    lastError: readErrorMessage(latest.output),
  };
}

export function summarizeDispatches(
  rows: ReadonlyArray<JobStateRow>,
  subscribers: ReadonlyArray<DispatchSubscriber>,
): Array<EventDispatch> {
  return subscribers.flatMap((subscriber) => {
    const dispatch = summarizeSubscriberDispatch(subscriber, rows);
    return dispatch ? [dispatch] : [];
  });
}
