import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeListEventsQuery from '#src/modules/event/queries/list-events.query.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';

function makeEvent(id: string) {
  return {
    id,
    type: 'model_comment.created',
    actorId: 'u1',
    resourceType: 'model',
    resourceId: 'm1',
    payload: {},
    createdAt: new Date(),
  };
}

function makePage(ids: Array<string>) {
  return { data: ids.map(makeEvent), count: ids.length, page: 0, limit: 20 };
}

function makeRow(
  value: string,
  queue: string,
  state: string,
  retryCount = 0,
  output: unknown = null,
) {
  return { value, queue, state, retryCount, output };
}

describe('listEventsQuery', () => {
  const eventRepository = mockEventRepository();
  const jobQueue = {
    findJobStates: vi.fn().mockResolvedValue([]),
    findJobValues: vi.fn().mockResolvedValue([]),
  };
  const query = makeListEventsQuery({ eventRepository, jobQueue } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    jobQueue.findJobStates.mockResolvedValue([]);
    jobQueue.findJobValues.mockResolvedValue([]);
    eventRepository.search.mockResolvedValue(makePage([]));
  });

  it('passes filters and paginated defaults through to the repository', async () => {
    await query.execute({ type: 'model.created' }, {});

    expect(eventRepository.search).toHaveBeenCalledWith(
      { type: 'model.created' },
      expect.objectContaining({
        limit: 20,
        page: 0,
        offset: 0,
        orderBy: { field: 'createdAt', param: 'desc' },
      }),
    );
    expect(jobQueue.findJobValues).not.toHaveBeenCalled();
  });

  it('applies the supplied page+limit and computes the offset', async () => {
    await query.execute({}, { limit: 5, page: 2 });

    const args = eventRepository.search.mock.calls[0]![1];
    expect(args.limit).toBe(5);
    expect(args.page).toBe(2);
    expect(args.offset).toBe(10);
  });

  it('looks job state up in every subscriber queue and its dead letter, for the page only', async () => {
    eventRepository.search.mockResolvedValue(makePage(['e1', 'e2']));

    await query.execute({}, {});

    expect(jobQueue.findJobStates).toHaveBeenCalledWith(
      ['user-notifications', 'user-notifications-dead', 'realtime', 'realtime-dead'],
      'eventId',
      ['e1', 'e2'],
    );
  });

  it('reports the dispatch of each subscriber for its own event', async () => {
    eventRepository.search.mockResolvedValue(makePage(['e1', 'e2']));
    jobQueue.findJobStates.mockResolvedValue([
      makeRow('e1', 'user-notifications', 'completed'),
      makeRow('e1', 'realtime', 'failed', 1, { message: 'boom' }),
      makeRow('e1', 'realtime-dead', 'created', 0, { message: 'boom' }),
      makeRow('e2', 'realtime', 'completed'),
    ]);

    const result = await query.execute({}, {});

    expect(result.data[0]!.dispatch).toEqual([
      { subscriber: 'user-notifications', state: 'completed', attempts: 1, lastError: null },
      { subscriber: 'realtime', state: 'dead', attempts: 2, lastError: 'boom' },
    ]);
    expect(result.data[1]!.dispatch).toEqual([
      { subscriber: 'realtime', state: 'completed', attempts: 1, lastError: null },
    ]);
  });

  it('reports an empty dispatch when no job is found for the event', async () => {
    eventRepository.search.mockResolvedValue(makePage(['e1']));

    const result = await query.execute({}, {});

    expect(result.data[0]!.dispatch).toEqual([]);
  });

  it('narrows to events whose job is retrying in any subscriber queue', async () => {
    jobQueue.findJobValues.mockImplementation(async (queue: string) =>
      queue === 'user-notifications' ? ['e1', 'e2'] : ['e2', 'e3'],
    );

    await query.execute({ dispatchState: 'retry' }, {});

    expect(jobQueue.findJobValues).toHaveBeenCalledWith('user-notifications', 'eventId', 'retry');
    expect(jobQueue.findJobValues).toHaveBeenCalledWith('realtime', 'eventId', 'retry');
    expect(eventRepository.search.mock.calls[0]![0]).toEqual({ ids: ['e1', 'e2', 'e3'] });
  });

  it('narrows to events with a copy in any subscriber dead-letter queue', async () => {
    jobQueue.findJobValues.mockImplementation(async (queue: string) =>
      queue === 'realtime-dead' ? ['e4'] : [],
    );

    await query.execute({ dispatchState: 'dead' }, {});

    expect(jobQueue.findJobValues).toHaveBeenCalledWith('user-notifications-dead', 'eventId');
    expect(jobQueue.findJobValues).toHaveBeenCalledWith('realtime-dead', 'eventId');
    expect(eventRepository.search.mock.calls[0]![0]).toEqual({ ids: ['e4'] });
  });
});
