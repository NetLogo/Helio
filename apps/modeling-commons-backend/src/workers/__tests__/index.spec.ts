import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

const envState = { enabled: true };

vi.mock('#src/config/env.ts', () => ({
  default: {
    product: { website: 'https://example.test' },
    workers: {
      get enabled() {
        return envState.enabled;
      },
    },
  },
}));

const startUserNotificationSubscriber = vi.fn();
const startModelDraftJanitor = vi.fn();
const startDigestProcessor = vi.fn();
const startNotificationJanitor = vi.fn();
const startEmailSender = vi.fn();

vi.mock('#src/workers/user-notification-subscriber.ts', () => ({
  startUserNotificationSubscriber: (...args: unknown[]) => startUserNotificationSubscriber(...args),
}));

vi.mock('#src/workers/model-draft-janitor.ts', () => ({
  startModelDraftJanitor: (...args: unknown[]) => startModelDraftJanitor(...args),
}));

vi.mock('#src/workers/digest-processor.ts', () => ({
  startDigestProcessor: (...args: unknown[]) => startDigestProcessor(...args),
}));

vi.mock('#src/workers/notification-janitor.ts', () => ({
  startNotificationJanitor: (...args: unknown[]) => startNotificationJanitor(...args),
}));

vi.mock('#src/workers/email-sender.ts', () => ({
  startEmailSender: (...args: unknown[]) => startEmailSender(...args),
}));

import { startWorkers } from '#src/workers/index.ts';

function makeFastify(): {
  fastify: FastifyInstance;
  hooks: Map<string, () => Promise<void>>;
  cradle: {
    eventRepository: unknown;
    notificationDeliveryService: unknown;
    notificationDigestService: unknown;
    userNotificationRepository: unknown;
    modelDraftService: unknown;
    mailService: unknown;
    boss: unknown;
  };
} {
  const hooks = new Map<string, () => Promise<void>>();
  const cradle = {
    eventRepository: { tag: 'er' },
    notificationDeliveryService: { tag: 'uns' },
    notificationDigestService: { tag: 'nds' },
    userNotificationRepository: { tag: 'unr' },
    modelDraftService: { tag: 'mds' },
    mailService: { tag: 'ms' },
    boss: { tag: 'boss' },
  };
  const fastify = {
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    diContainer: { cradle },
    addHook: (name: string, fn: () => Promise<void>) => hooks.set(name, fn),
  } as unknown as FastifyInstance;
  return { fastify, hooks, cradle };
}

describe('startWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.enabled = true;
  });

  it('skips startup when WORKERS_ENABLED is false', async () => {
    envState.enabled = false;
    const { fastify } = makeFastify();

    await startWorkers(fastify);

    expect(startUserNotificationSubscriber).not.toHaveBeenCalled();
    expect(startModelDraftJanitor).not.toHaveBeenCalled();
    expect(startDigestProcessor).not.toHaveBeenCalled();
    expect(startNotificationJanitor).not.toHaveBeenCalled();
    expect(startEmailSender).not.toHaveBeenCalled();
  });

  it('starts every worker on the shared boss without owning its lifecycle', async () => {
    const { fastify, hooks, cradle } = makeFastify();
    await startWorkers(fastify);

    expect(startUserNotificationSubscriber).toHaveBeenCalledWith({
      boss: cradle.boss,
      eventRepository: cradle.eventRepository,
      notificationDeliveryService: cradle.notificationDeliveryService,
      logger: fastify.log,
    });
    expect(startModelDraftJanitor).toHaveBeenCalledWith({
      boss: cradle.boss,
      modelDraftService: cradle.modelDraftService,
      logger: fastify.log,
    });
    expect(startDigestProcessor).toHaveBeenCalledWith({
      boss: cradle.boss,
      userNotificationRepository: cradle.userNotificationRepository,
      notificationDigestService: cradle.notificationDigestService,
      logger: fastify.log,
    });
    expect(startNotificationJanitor).toHaveBeenCalledWith({
      boss: cradle.boss,
      userNotificationRepository: cradle.userNotificationRepository,
      logger: fastify.log,
    });
    expect(startEmailSender).toHaveBeenCalledWith({
      boss: cradle.boss,
      mailService: cradle.mailService,
      logger: fastify.log,
    });

    expect(hooks.has('onClose')).toBe(false);
  });
});
