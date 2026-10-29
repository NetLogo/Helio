import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

const envState = { enabled: true };

vi.mock('#src/config/env.ts', () => ({
  default: {
    db: { url: 'postgres://test' },
    workers: {
      get enabled() {
        return envState.enabled;
      },
    },
  },
}));

const startEventProcessor = vi.fn();
const startModelDraftJanitor = vi.fn();
const startDigestProcessor = vi.fn();
const startNotificationJanitor = vi.fn();
const startEmailSender = vi.fn();

vi.mock('#src/workers/event-processor.ts', () => ({
  startEventProcessor: (...args: unknown[]) => startEventProcessor(...args),
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
    emailQueueRepository: unknown;
    mailService: unknown;
    emailQueueNotifier: unknown;
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
    emailQueueRepository: { tag: 'eqr' },
    mailService: { tag: 'ms' },
    emailQueueNotifier: { tag: 'eqn' },
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

    expect(startEventProcessor).not.toHaveBeenCalled();
    expect(startModelDraftJanitor).not.toHaveBeenCalled();
    expect(startDigestProcessor).not.toHaveBeenCalled();
    expect(startNotificationJanitor).not.toHaveBeenCalled();
    expect(startEmailSender).not.toHaveBeenCalled();
  });

  it('starts every worker and registers an onClose hook that drains them', async () => {
    const eventBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    const janitorBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    const digestBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    const notificationJanitorBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    startEventProcessor.mockResolvedValue(eventBoss);
    startModelDraftJanitor.mockResolvedValue(janitorBoss);
    startDigestProcessor.mockResolvedValue(digestBoss);
    startNotificationJanitor.mockResolvedValue(notificationJanitorBoss);
    const emailBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    startEmailSender.mockResolvedValue(emailBoss);

    const { fastify, hooks, cradle } = makeFastify();
    await startWorkers(fastify);

    expect(startEventProcessor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      eventRepository: cradle.eventRepository,
      userNotificationService: cradle.userNotificationService,
      logger: fastify.log,
    });
    expect(startModelDraftJanitor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      modelDraftService: cradle.modelDraftService,
      logger: fastify.log,
    });
    expect(startDigestProcessor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      userNotificationRepository: cradle.userNotificationRepository,
      notificationPreferenceRepository: cradle.notificationPreferenceRepository,
      userNotificationDomain: cradle.userNotificationDomain,
      notificationDigestService: cradle.notificationDigestService,
      logger: fastify.log,
    });
    expect(startNotificationJanitor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      userNotificationRepository: cradle.userNotificationRepository,
      emailQueueRepository: cradle.emailQueueRepository,
      logger: fastify.log,
    });
    expect(startEmailSender).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      emailQueueRepository: cradle.emailQueueRepository,
      mailService: cradle.mailService,
      emailQueueNotifier: cradle.emailQueueNotifier,
      logger: fastify.log,
    });

    const onClose = hooks.get('onClose');
    expect(onClose).toBeDefined();
    await onClose!();
    expect(eventBoss.stop).toHaveBeenCalledWith({ graceful: true });
    expect(janitorBoss.stop).toHaveBeenCalledWith({ graceful: true });
    expect(digestBoss.stop).toHaveBeenCalledWith({ graceful: true });
    expect(notificationJanitorBoss.stop).toHaveBeenCalledWith({ graceful: true });
    expect(emailBoss.stop).toHaveBeenCalledWith({ graceful: true });
  });
});
