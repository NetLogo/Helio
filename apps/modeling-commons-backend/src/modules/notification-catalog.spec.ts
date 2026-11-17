import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer, type AwilixContainer } from 'awilix';
import type { FastifyBaseLogger } from 'fastify';
import workersConfig from '#src/config/workers.ts';
import {
  notificationCategories,
  notificationEventTypes,
  notificationModules,
  type RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import { loadDependencies } from '#src/server/di/index.ts';
import type { EventBus } from '#src/shared/cqrs/bus.types.ts';

describe('notification catalog', () => {
  let container: AwilixContainer<Dependencies>;
  let registered: ReadonlyArray<RegisteredNotificationModule>;

  beforeAll(async () => {
    container = createContainer<Dependencies>();
    await loadDependencies(container, {
      logger: {} as FastifyBaseLogger,
      eventBus: {} as EventBus,
    });
    registered = container.resolve('registeredNotificationModules');
  });

  it('registers every catalog module with its own metadata and a built producer', () => {
    expect(
      registered.map(({ name, eventTypes, categories }) => ({ name, eventTypes, categories })),
    ).toEqual(
      notificationModules.map(({ name, eventTypes, categories }) => ({
        name,
        eventTypes,
        categories,
      })),
    );
    for (const { producer } of registered) {
      expect(producer.buildNotifications).toBeTypeOf('function');
    }
  });

  it('gives every module a distinct, non-empty name', () => {
    const names = registered.map((module) => module.name);

    expect(names.every((name) => name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('handles exactly the event types the composition subscribes to', () => {
    const handled = new Set(registered.flatMap((module) => module.eventTypes));

    expect([...handled].sort()).toEqual([...new Set(notificationEventTypes)].sort());
  });

  it('subscribes the user-notifications queue to every producer event type exactly once', () => {
    const union = new Set(registered.flatMap((module) => module.eventTypes));

    expect([...workersConfig.userNotifications.subscribesTo].sort()).toEqual([...union].sort());
  });

  it('derives the subscribed event types from the module objects', () => {
    expect(notificationEventTypes).toEqual(
      notificationModules.flatMap((module) => module.eventTypes),
    );
    expect(workersConfig.userNotifications.subscribesTo).toBe(notificationEventTypes);
  });

  it('has every catalog category claimed by exactly one registered module', () => {
    for (const category of notificationCategories) {
      expect(registered.filter((module) => category in module.categories)).toHaveLength(1);
    }
  });
});
