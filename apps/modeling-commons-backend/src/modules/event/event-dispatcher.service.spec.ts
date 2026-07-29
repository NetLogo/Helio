import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import makeEventDispatcherService, {
  createEventDispatcher,
} from '#src/modules/event/event-dispatcher.service.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { EventSubscriber } from '#src/modules/user-notification/domain/user-notification.types.ts';

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'actor-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: {},
    createdAt: new Date('2026-01-01'),
    processedAt: null,
    attempts: 0,
    lastError: null,
    ...overrides,
  };
}

function makeSubscriber(handles: boolean): { [K in keyof EventSubscriber]: ReturnType<typeof vi.fn> } {
  return {
    handles: vi.fn().mockReturnValue(handles),
    handleEvent: vi.fn().mockResolvedValue(undefined),
  };
}

function dispatcherWith(
  subscribers: Array<ReturnType<typeof makeSubscriber>>,
  loggerOverride: FastifyBaseLogger = logger,
) {
  return createEventDispatcher(subscribers as unknown as Array<EventSubscriber>, loggerOverride);
}

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

describe('createEventDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only invokes handleEvent on subscribers whose handles() returns true', async () => {
    const subscribed = makeSubscriber(true);
    const unsubscribed = makeSubscriber(false);
    const dispatcher = dispatcherWith([subscribed, unsubscribed]);
    const event = makeEvent();

    await dispatcher.dispatch(event);

    expect(subscribed.handles).toHaveBeenCalledWith(event.type);
    expect(subscribed.handleEvent).toHaveBeenCalledWith(event);
    expect(unsubscribed.handleEvent).not.toHaveBeenCalled();
  });

  it('does nothing when no subscriber handles the event type', async () => {
    const unsubscribed = makeSubscriber(false);
    const dispatcher = dispatcherWith([unsubscribed]);

    await expect(dispatcher.dispatch(makeEvent())).resolves.toBeUndefined();
    expect(unsubscribed.handleEvent).not.toHaveBeenCalled();
  });

  it('runs every matching subscriber even when one throws', async () => {
    const failing = makeSubscriber(true);
    failing.handleEvent.mockRejectedValue(new Error('boom'));
    const succeeding = makeSubscriber(true);
    const dispatcher = dispatcherWith([failing, succeeding]);

    await expect(dispatcher.dispatch(makeEvent())).rejects.toThrow(AggregateError);

    expect(failing.handleEvent).toHaveBeenCalledTimes(1);
    expect(succeeding.handleEvent).toHaveBeenCalledTimes(1);
  });

  it('logs each rejection and rethrows an AggregateError carrying every failure', async () => {
    const errorA = new Error('subscriber A failed');
    const errorB = new Error('subscriber B failed');
    const subscriberA = makeSubscriber(true);
    subscriberA.handleEvent.mockRejectedValue(errorA);
    const subscriberB = makeSubscriber(true);
    subscriberB.handleEvent.mockRejectedValue(errorB);
    const dispatcher = dispatcherWith([subscriberA, subscriberB]);

    let thrown: unknown;
    try {
      await dispatcher.dispatch(makeEvent());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual(expect.arrayContaining([errorA, errorB]));
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('does not throw when every matching subscriber succeeds', async () => {
    const subscriber = makeSubscriber(true);
    const dispatcher = dispatcherWith([subscriber]);

    await expect(dispatcher.dispatch(makeEvent())).resolves.toBeUndefined();
  });
});

describe('makeEventDispatcherService', () => {
  it('registers the user notification service as its sole subscriber', async () => {
    const userNotificationService = makeSubscriber(true);
    const service = makeEventDispatcherService({
      userNotificationService,
      logger,
    } as never);
    const event = makeEvent();

    await service.dispatch(event);

    expect(userNotificationService.handles).toHaveBeenCalledWith(event.type);
    expect(userNotificationService.handleEvent).toHaveBeenCalledWith(event);
  });
});
