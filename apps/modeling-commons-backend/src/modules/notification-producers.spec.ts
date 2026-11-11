import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer, type AwilixContainer } from 'awilix';
import type { FastifyBaseLogger } from 'fastify';
import workersConfig from '#src/config/workers.ts';
import {
  NOTIFICATION_CATEGORIES,
  listNotificationEventTypes,
  notificationEventTypes,
  notificationModules,
} from '#src/modules/notification-producers.ts';
import type { NotificationProducer } from '#src/modules/user-notification/domain/user-notification.types.ts';
import { loadDependencies } from '#src/server/di/index.ts';
import type { EventBus } from '#src/shared/cqrs/bus.types.ts';

describe('notification producers', () => {
  let container: AwilixContainer<Dependencies>;
  let producers: ReadonlyArray<NotificationProducer>;

  beforeAll(async () => {
    container = createContainer<Dependencies>();
    await loadDependencies(container, {
      logger: {} as FastifyBaseLogger,
      eventBus: {} as EventBus,
    });
    producers = container.resolve('notificationProducers');
  });

  it.each(notificationModules.map((module, index) => [index, module] as const))(
    'resolves module %i to a producer that declares its event types and categories',
    (_index, module) => {
      const producer = module.producer(container.cradle);

      expect(producer.eventTypes).toEqual(module.eventTypes);
      expect(producer.categories).toEqual(module.categories);
    },
  );

  it('gives every producer a distinct, non-empty name', () => {
    const names = producers.map((producer) => producer.name);

    expect(names.every((name) => name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('handles exactly the event types the composition subscribes to', () => {
    const handled = new Set(producers.flatMap((producer) => producer.eventTypes));

    expect([...handled].sort()).toEqual([...new Set(notificationEventTypes)].sort());
  });

  it('subscribes the user-notifications queue to every producer event type exactly once', () => {
    const union = new Set(producers.flatMap((producer) => producer.eventTypes));

    expect([...workersConfig.userNotifications.subscribesTo].sort()).toEqual([...union].sort());
  });

  it('derives the subscribed event types from the module objects', () => {
    const modules = [
      { eventTypes: ['model.comment.created'] },
      { eventTypes: ['model.published', 'user.followed'] },
    ];

    expect(listNotificationEventTypes(modules)).toEqual([
      'model.comment.created',
      'model.published',
      'user.followed',
    ]);
    expect(notificationEventTypes).toEqual(listNotificationEventTypes(notificationModules));
    expect(workersConfig.userNotifications.subscribesTo).toBe(notificationEventTypes);
  });

  it('has every catalog category claimed by exactly one producer', () => {
    const domain = container.resolve('userNotificationDomain');

    for (const category of NOTIFICATION_CATEGORIES) {
      expect(domain.getProducer(category).categories).toHaveProperty([category]);
    }
  });
});
