import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type EventRecord = {
  id: string;
  type: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
};

export type InsertEventParams = {
  type: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
};

export interface EventRepositoryPort {
  insert(ctx: TransactionContext, params: InsertEventParams): Promise<void>;
  findUnprocessed(limit: number): Promise<EventRecord[]>;
  markProcessed(id: string): Promise<void>;
  search(
    filters: EventSearchFilters,
    params: PaginatedQueryParams,
  ): Promise<Paginated<EventRecord>>;
}
