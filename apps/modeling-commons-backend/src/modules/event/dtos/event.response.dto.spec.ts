import { describe, it, expect } from 'vitest';
import { Value } from 'typebox/value';
import { eventDispatchDtoSchema } from '#src/modules/event/dtos/event.response.dto.ts';

describe('eventDispatchDtoSchema', () => {
  it.each(['created', 'retry', 'active', 'completed', 'cancelled', 'failed', 'dead'])(
    'accepts a %s dispatch',
    (state) => {
      expect(
        Value.Check(eventDispatchDtoSchema, {
          subscriber: 'realtime',
          state,
          attempts: 1,
          lastError: null,
        }),
      ).toBe(true);
    },
  );

  it('rejects a state pg-boss does not have', () => {
    expect(
      Value.Check(eventDispatchDtoSchema, {
        subscriber: 'realtime',
        state: 'paused',
        attempts: 1,
        lastError: null,
      }),
    ).toBe(false);
  });
});
