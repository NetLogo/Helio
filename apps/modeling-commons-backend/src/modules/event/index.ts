import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { DomainEvent } from '#src/modules/event/domain/event.types.ts';
import type { EventRecord, EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';
import type { EventResponseDto } from '#src/modules/event/dtos/event.response.dto.ts';

declare global {
  export interface Dependencies {
    eventMapper: Mapper<DomainEvent, EventRecord, EventResponseDto>;
    eventRepository: EventRepositoryPort;
    listEventsQuery: ReturnType<
      typeof import('#src/modules/event/queries/list-events.query.ts').default
    >;
  }
}
