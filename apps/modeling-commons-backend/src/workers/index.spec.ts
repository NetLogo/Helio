import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

const envState = { enabled: true };

vi.mock('#src/config/env.ts', () => ({
  default: {
    workers: {
      get enabled() {
        return envState.enabled;
      },
    },
  },
}));

const startUserNotificationSubscriber = vi.fn();
const startRealtimeSubscriber = vi.fn();
const startModelDraftJanitor = vi.fn();
const startDigestProcessor = vi.fn();
const startNotificationJanitor = vi.fn();
const startEmailSender = vi.fn();

vi.mock('#src/workers/user-notification-subscriber.ts', () => ({
  startUserNotificationSubscriber: (...args: unknown[]) => startUserNotificationSubscriber(...args),
}));

vi.mock('#src/workers/realtime-subscriber.ts', () => ({
  startRealtimeSubscriber: (...args: unknown[]) => startRealtimeSubscriber(...args),
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
    userNotificationService: unknown;
    notificationDigestService: unknown;
    userNotificationRepository: unknown;
    notificationPreferenceRepository: unknown;
    userNotificationDomain: unknown;
    modelDraftService: unknown;
    mailService: unknown;
    db: unknown;
    boss: { unschedule: ReturnType<typeof vi.fn> };
  };
} {
  const hooks = new Map<string, () => Promise<void>>();
  const cradle = {
    eventRepository: { tag: 'er' },
    userNotificationService: { tag: 'uns' },
    notificationDigestService: { tag: 'nds' },
    userNotificationRepository: { tag: 'unr' },
    notificationPreferenceRepository: { tag: 'npr' },
    userNotificationDomain: { tag: 'und' },
    modelDraftService: { tag: 'mds' },
    mailService: { tag: 'ms' },
    db: { tag: 'db' },
    boss: { unschedule: vi.fn().mockResolvedValue(undefined) },
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
    expect(startRealtimeSubscriber).not.toHaveBeenCalled();
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
      userNotificationService: cradle.userNotificationService,
      logger: fastify.log,
    });
    expect(startRealtimeSubscriber).toHaveBeenCalledWith({
      boss: cradle.boss,
      db: cradle.db,
      eventRepository: cradle.eventRepository,
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
      notificationPreferenceRepository: cradle.notificationPreferenceRepository,
      userNotificationDomain: cradle.userNotificationDomain,
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

  it('drops the schedules of the retired queues', async () => {
    const { fastify, cradle } = makeFastify();
    await startWorkers(fastify);

    expect(cradle.boss.unschedule).toHaveBeenCalledWith('send-notification-digests');
    expect(cradle.boss.unschedule).toHaveBeenCalledWith('process-events');
    expect(cradle.boss.unschedule).toHaveBeenCalledWith('send-emails');
    expect(cradle.boss.unschedule).toHaveBeenCalledWith('event-dispatch');
  });
});
