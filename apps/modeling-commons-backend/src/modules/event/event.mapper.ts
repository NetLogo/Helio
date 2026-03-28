import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { DomainEvent } from '#src/modules/event/domain/event.types.ts';
import type { EventResponseDto } from '#src/modules/event/dtos/event.response.dto.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';

export default function eventMapper(): Mapper<DomainEvent, EventRecord, EventResponseDto> {
  return {
    toDomain(record: EventRecord): DomainEvent {
      return {
        id: record.id,
        type: record.type,
        actorId: record.actorId,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        payload: record.payload,
        createdAt: new Date(record.createdAt),
        processedAt: record.processedAt ? new Date(record.processedAt) : null,
      };
    },

    toResponse(entity: DomainEvent): EventResponseDto {
      return {
        id: entity.id,
        type: entity.type,
        actorId: entity.actorId,
        resourceType: entity.resourceType,
        resourceId: entity.resourceId,
        payload: entity.payload,
        createdAt: entity.createdAt.toISOString(),
        processedAt: entity.processedAt ? entity.processedAt.toISOString() : null,
      };
    },

    toPersistence(entity: DomainEvent): EventRecord {
      return {
        id: entity.id,
        type: entity.type,
        actorId: entity.actorId,
        resourceType: entity.resourceType,
        resourceId: entity.resourceId,
        payload: entity.payload,
        createdAt: entity.createdAt,
        processedAt: entity.processedAt,
      };
    },
  };
}
