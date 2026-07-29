import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { EventSubscriber } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { FastifyBaseLogger } from 'fastify';

export function createEventDispatcher(subscribers: Array<EventSubscriber>, logger: FastifyBaseLogger) {
  return {
    async dispatch(event: EventRecord): Promise<void> {
      const targets = subscribers.filter((subscriber) => subscriber.handles(event.type));
      if (targets.length === 0) return;

      const results = await Promise.allSettled(
        targets.map(async (subscriber) => subscriber.handleEvent(event)),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );

      for (const failure of failures) {
        logger.error({
          name: 'EventDispatcherService',
          message: 'A subscriber failed to handle an event',
          error: failure.reason,
        });
      }

      if (failures.length > 0) {
        const reasons: Array<unknown> = failures.map((failure) => failure.reason as unknown);
        throw new AggregateError(reasons, 'One or more subscribers failed to handle the event');
      }
    },
  };
}

// The subscriber array is explicit rather than discovered by container enumeration -
// adding another producing module later is one line here.
export default function makeEventDispatcherService({
  userNotificationService,
  logger,
}: Dependencies) {
  return createEventDispatcher([userNotificationService], logger);
}
