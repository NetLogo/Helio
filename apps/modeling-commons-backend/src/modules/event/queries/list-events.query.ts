import { getDeadLetterQueueName, listSubscriberEntries } from '#src/workers/queues.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import {
  summarizeDispatches,
  type DispatchSubscriber,
} from '#src/modules/event/domain/event-dispatch.ts';
import type { EventDispatch, EventListFilters } from '#src/modules/event/domain/event.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export type ListedEvent = EventRecord & { dispatch: Array<EventDispatch> };

const subscribers: Array<DispatchSubscriber> = listSubscriberEntries().map(({ queueName }) => ({
  subscriber: queueName,
  queueName,
  deadLetterQueueName: getDeadLetterQueueName(queueName),
}));

export default function makeListEventsQuery({ eventRepository, jobQueue }: Dependencies) {
  async function findIdsInDispatchState(
    state: NonNullable<EventListFilters['dispatchState']>,
  ): Promise<Array<string>> {
    const idLists = await Promise.all(
      subscribers.map(async ({ queueName, deadLetterQueueName }) =>
        state === 'dead'
          ? jobQueue.findJobValues(deadLetterQueueName, 'eventId')
          : jobQueue.findJobValues(queueName, 'eventId', state),
      ),
    );
    return [...new Set(idLists.flat())];
  }

  return {
    async execute(
      filters: EventListFilters,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<ListedEvent>> {
      const params = paginatedQueryBase(query);
      const { dispatchState, ...searchFilters } = filters;
      const ids = dispatchState ? await findIdsInDispatchState(dispatchState) : undefined;

      const page = await eventRepository.search(
        ids ? { ...searchFilters, ids } : searchFilters,
        params,
      );
      const rows = await jobQueue.findJobStates(
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
          dispatch: summarizeDispatches(
            rows.filter((row) => row.value === event.id),
            subscribers,
          ),
        })),
      };
    },
  };
}
