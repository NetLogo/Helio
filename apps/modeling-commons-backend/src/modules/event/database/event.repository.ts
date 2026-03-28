import type {
  EventRecord,
  EventRepositoryPort,
  InsertEventParams,
} from '#src/modules/event/database/event.repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function eventRepository({ db }: Dependencies): EventRepositoryPort {
  return {
    async insert(ctx: TransactionContext, params: InsertEventParams): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.event.create({
        data: {
          type: params.type,
          actorId: params.actorId,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          payload: params.payload,
        },
      });
    },

    async findUnprocessed(limit: number): Promise<EventRecord[]> {
      const records = await db.event.findMany({
        where: { processedAt: null },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      return records as unknown as EventRecord[];
    },

    async markProcessed(id: string): Promise<void> {
      await db.event.update({
        where: { id },
        data: { processedAt: new Date() },
      });
    },

    async search(
      filters: EventSearchFilters,
      params: PaginatedQueryParams,
    ): Promise<Paginated<EventRecord>> {
      const where: Pick<EventSearchFilters, 'type' | 'resourceType'> = {};

      if (filters.type) where.type = filters.type;
      if (filters.resourceType) where.resourceType = filters.resourceType;

      const [count, records] = await Promise.all([
        db.event.count({ where }),
        db.event.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);

      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records as unknown as EventRecord[],
      };
    },
  };
}
