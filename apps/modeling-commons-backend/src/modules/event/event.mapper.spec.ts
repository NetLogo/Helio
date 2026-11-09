import { describe, it, expect } from 'vitest';
import eventMapper from '#src/modules/event/event.mapper.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';

const mapper = eventMapper();

function makeRecord(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'evt-1',
    type: 'model.created',
    actorId: 'user-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: { draftId: 'd1' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('eventMapper', () => {
  describe('toDomain', () => {
    it('round-trips a basic record', () => {
      const record = makeRecord();
      const domain = mapper.toDomain(record);
      expect(domain.id).toBe('evt-1');
      expect(domain.type).toBe('model.created');
      expect(domain.payload).toEqual({ draftId: 'd1' });
    });
  });

  describe('toResponse', () => {
    it('serialises dates as ISO strings', () => {
      const response = mapper.toResponse(mapper.toDomain(makeRecord()));
      expect(response.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('toPersistence', () => {
    it('preserves the entity fields without converting dates', () => {
      const domain = mapper.toDomain(makeRecord());
      const persisted = mapper.toPersistence(domain);
      expect(persisted.createdAt).toBeInstanceOf(Date);
      expect(persisted.id).toBe(domain.id);
    });
  });
});
