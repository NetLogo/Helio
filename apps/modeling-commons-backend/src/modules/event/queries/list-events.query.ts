import rules from '#src/config/rules.ts';
import { subscriberQueues } from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { summarizeDispatches } from '#src/modules/event/domain/event-dispatch.ts';
import type { EventDispatch, EventListFilters } from '#src/modules/event/domain/event.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export type EventWithDispatches = EventRecord & { dispatches: Array<EventDispatch> };

const subscribers = subscriberQueues.map(({ queueName }) => ({
  queueName,
  deadLetterQueueName: getDeadLetterQueueName(queueName),
}));

export default function makeListEventsQuery({ eventRepository, jobQueue }: Dependencies) {
  async function findEventIdsByDispatchState(
    state: NonNullable<EventListFilters['dispatchState']>,
  ): Promise<Array<string>> {
    const limit = rules.limits.eventAdmin.dispatchStateMaxEventIdsPerQueue;
    const idLists = await Promise.all(
      subscribers.map(async ({ queueName, deadLetterQueueName }) =>
        state === 'dead'
          ? jobQueue.findJobValues(deadLetterQueueName, 'eventId', { limit })
          : jobQueue.findJobValues(queueName, 'eventId', { limit, state }),
      ),
    );
    return [...new Set(idLists.flat())];
  }

  return {
    async execute(
      filters: EventListFilters,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<EventWithDispatches>> {
      const pagination = paginatedQueryBase(query);
      const { dispatchState, ...searchFilters } = filters;
      const eventIds = dispatchState ? await findEventIdsByDispatchState(dispatchState) : undefined;

      const page = await eventRepository.search(
        eventIds ? { ...searchFilters, ids: eventIds } : searchFilters,
        pagination,
      );
      const jobStates = await jobQueue.findJobStates(
        subscribers.flatMap(({ queueName, deadLetterQueueName }) => [
          queueName,
          deadLetterQueueName,
        ]),
        'eventId',
        page.data.map((event) => event.id),
      );

      return {
        ...page,
        data: page.data.map((event) => ({
          ...event,
          dispatches: summarizeDispatches(
            jobStates.filter((jobState) => jobState.value === event.id),
            subscribers,
          ),
        })),
      };
    },
  };
}
