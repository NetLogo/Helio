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

vi.mock('#src/workers/event-processor.ts', () => ({
  startEventProcessor: (...args: unknown[]) => startEventProcessor(...args),
}));

vi.mock('#src/workers/model-draft-janitor.ts', () => ({
  startModelDraftJanitor: (...args: unknown[]) => startModelDraftJanitor(...args),
}));

import { startWorkers } from '#src/workers/index.ts';

function makeFastify(): {
  fastify: FastifyInstance;
  hooks: Map<string, () => Promise<void>>;
  cradle: { eventRepository: unknown; eventDispatcherService: unknown; modelDraftService: unknown };
} {
  const hooks = new Map<string, () => Promise<void>>();
  const cradle = {
    eventRepository: { tag: 'er' },
    eventDispatcherService: { tag: 'eds' },
    modelDraftService: { tag: 'mds' },
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
  });

  it('starts both workers and registers an onClose hook that drains them', async () => {
    const eventBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    const janitorBoss = { stop: vi.fn().mockResolvedValue(undefined) };
    startEventProcessor.mockResolvedValue(eventBoss);
    startModelDraftJanitor.mockResolvedValue(janitorBoss);

    const { fastify, hooks, cradle } = makeFastify();
    await startWorkers(fastify);

    expect(startEventProcessor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      eventRepository: cradle.eventRepository,
      eventDispatcherService: cradle.eventDispatcherService,
      logger: fastify.log,
    });
    expect(startModelDraftJanitor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
      modelDraftService: cradle.modelDraftService,
      logger: fastify.log,
    });

    const onClose = hooks.get('onClose');
    expect(onClose).toBeDefined();
    await onClose!();
    expect(eventBoss.stop).toHaveBeenCalledWith({ graceful: true });
    expect(janitorBoss.stop).toHaveBeenCalledWith({ graceful: true });
  });
});
