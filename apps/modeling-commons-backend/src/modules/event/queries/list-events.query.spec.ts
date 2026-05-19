import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeListEventsQuery from '#src/modules/event/queries/list-events.query.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';

describe('listEventsQuery', () => {
  const eventRepository = mockEventRepository();
  const query = makeListEventsQuery({ eventRepository } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes filters and paginated defaults through to the repository', async () => {
    eventRepository.search.mockResolvedValue({ data: [], total: 0, page: 0, limit: 20 });

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
  });

  it('applies the supplied page+limit and computes the offset', async () => {
    eventRepository.search.mockResolvedValue({ data: [], total: 0, page: 2, limit: 5 });

    await query.execute({}, { limit: 5, page: 2 });

    const args = eventRepository.search.mock.calls[0]![1];
    expect(args.limit).toBe(5);
    expect(args.page).toBe(2);
    expect(args.offset).toBe(10);
  });

  it('returns the paginated result from the repository unchanged', async () => {
    const expected = {
      data: [
        {
          id: 'e1',
          type: 'model.created',
          actorId: 'u1',
          resourceType: 'model',
          resourceId: 'm1',
          payload: {},
          createdAt: new Date(),
          processedAt: null,
        },
      ],
      total: 1,
      page: 0,
      limit: 20,
    };
    eventRepository.search.mockResolvedValue(expected);

    const result = await query.execute({}, {});
    expect(result).toBe(expected);
  });
});
