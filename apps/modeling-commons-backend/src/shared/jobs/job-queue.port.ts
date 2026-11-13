import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { SendOptions } from 'pg-boss';

export type JobQueueSendOptions = Omit<SendOptions, 'db'>;

export type JobStateRow = {
  value: string;
  queue: string;
  state: string;
  retryCount: number;
  output: unknown;
};

export type JobQueue = {
  sendTx: (
    ctx: TransactionContext,
    queue: string,
    data: object,
    options?: JobQueueSendOptions,
  ) => Promise<string | null>;
  publish: (event: string, data: object) => Promise<void>;
  publishTx: (ctx: TransactionContext, event: string, data: object) => Promise<void>;
  findJobStates: (
    queues: Array<string>,
    field: string,
    values: Array<string>,
  ) => Promise<Array<JobStateRow>>;
  findJobValues: (
    queue: string,
    field: string,
    filters: { limit: number; state?: string },
  ) => Promise<Array<string>>;
};
