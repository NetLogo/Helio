import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { EventSearchFilters } from '#src/modules/event/domain/event.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeListEventsQuery({ eventRepository }: Dependencies) {
  return {
    async execute(
      filters: EventSearchFilters,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<EventRecord>> {
      const params = paginatedQueryBase(query);
      return eventRepository.search(filters, params);
    },
  };
}
