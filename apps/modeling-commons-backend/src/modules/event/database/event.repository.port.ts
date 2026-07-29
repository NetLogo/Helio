import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type KnownEvents =
  | 'model.created'
  | 'model.deleted'
  | 'model.liked'
  | 'model.unliked'
  | 'model.version.created'
  | 'model.version.updated'
  | 'model_additional_file.added'
  | 'model_additional_file.deleted'
  | 'model_author.added'
  | 'model_author.ownership_transferred'
  | 'model_author.removed'
  | 'model_comment.created'
  | 'model_comment.deleted'
  | 'model_comment.updated'
  | 'model_permission.granted'
  | 'model_permission.revoked'
  | 'model_version.created'
  | 'model_version.updated'
  | 'model_version_tag.added'
  | 'model_version_tag.removed'
  | 'user.deleted'
  | 'user.updated';

export type EventRecord = {
  id: string;
  type: string | KnownEvents;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
};

export type InsertEventParams = {
  type: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
};

export interface EventRepositoryPort {
  insert: (ctx: TransactionContext, params: InsertEventParams) => Promise<void>;
  // `maxAttempts` caps how often a poison event is retried; omitting it selects regardless of
  // how many times dispatch has already failed.
  findUnprocessed: (limit: number, maxAttempts?: number) => Promise<Array<EventRecord>>;
  markProcessed: (id: string) => Promise<void>;
  markFailed: (id: string, error: unknown) => Promise<void>;
  search: (
    filters: EventSearchFilters,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<EventRecord>>;
}
