import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { EventPayloads, EventType } from '#src/modules/event-catalog.ts';

type EventRecordBase = {
  id: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
};

export type EventRecord = {
  [T in EventType]: EventRecordBase & { type: T; payload: EventPayloads[T] };
}[EventType];

export type EventJobData = { eventId: string };

export type InsertEventParams<T extends EventType = EventType> = {
  type: T;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: EventPayloads[T];
};

export interface EventRepositoryPort {
  insertTx: <T extends EventType>(
    ctx: TransactionContext,
    params: InsertEventParams<T>,
  ) => Promise<void>;
  findOneById: (id: string) => Promise<EventRecord | null>;
  search: (
    filters: EventSearchFilters,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<EventRecord>>;
}
