import type { EventDispatch, EventDispatchState } from '#src/modules/event/domain/event.types.ts';
import type { JobStateRow } from '#src/shared/jobs/job-queue.port.ts';
import { isRecord } from '#src/shared/utils/json.ts';

function readErrorMessage(output: unknown): string | null {
  if (!isRecord(output)) return null;
  const { message } = output;
  if (typeof message !== 'string') return null;
  return message;
}

function countAttempts(row: JobStateRow): number {
  return row.state === 'created' ? row.retryCount : row.retryCount + 1;
}

export function summarizeDispatches(
  rows: ReadonlyArray<JobStateRow>,
  subscribers: ReadonlyArray<{ queueName: string; deadLetterQueueName: string }>,
): Array<EventDispatch> {
  return subscribers.flatMap(({ queueName, deadLetterQueueName }) => {
    const live = rows.find((row) => row.queue === queueName);
    const dead = rows.find((row) => row.queue === deadLetterQueueName);
    const latest = dead ?? live;
    if (!latest) return [];

    return [
      {
        subscriber: queueName,
        state: dead ? 'dead' : (latest.state as EventDispatchState),
        attempts: live ? countAttempts(live) : null,
        lastError: readErrorMessage(latest.output),
      },
    ];
  });
}
