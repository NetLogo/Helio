import type {
  EventJobData,
  EventRecord,
  EventRepositoryPort,
  InsertEventParams,
} from '#src/modules/event/database/event.repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function eventRepository({ db, jobQueue }: Dependencies): EventRepositoryPort {
  return {
    async insertTx(ctx: TransactionContext, params: InsertEventParams): Promise<void> {
      const client = resolveTransaction(ctx);
      const event = await client.event.create({
        data: {
          type: params.type,
          actorId: params.actorId,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          payload: params.payload,
        },
      });
      const data: EventJobData = { eventId: event.id };
      await jobQueue.publishTx(ctx, params.type, data);
    },

    async findOneById(id: string): Promise<EventRecord | null> {
      const record = await db.event.findUnique({ where: { id } });
      return record as unknown as EventRecord | null;
    },

    async search(
      filters: EventSearchFilters,
      params: PaginatedQueryParams,
    ): Promise<Paginated<EventRecord>> {
      const where: { type?: string; resourceType?: string; id?: { in: Array<string> } } = {};

      if (filters.type) where.type = filters.type;
      if (filters.resourceType) where.resourceType = filters.resourceType;
      if (filters.ids) where.id = { in: filters.ids };

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
        data: records as unknown as Array<EventRecord>,
      };
    },
  };
}
