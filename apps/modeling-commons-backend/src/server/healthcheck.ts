import env from '#src/config/env.ts';
import { prisma } from '#src/shared/db/prisma.client.ts';
import type { FastifyBaseLogger } from 'fastify';
import net from 'node:net';

const checkTimeoutMs = 3000;

type HealthCheck = {
  name: string;
  run: () => Promise<void>;
  optional: boolean;
};

const checkPostgres = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};

const checkRedis = async (): Promise<void> => {
  const url = new URL(env.cache.url);
  const host = url.hostname || env.cache.host;
  const port = Number(url.port || env.cache.port);

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(checkTimeoutMs);
    socket.once('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });
    socket.once('data', (data) => {
      if (data.toString().startsWith('+PONG')) finish();
      else finish(new Error('Redis did not respond to PING'));
    });
    socket.once('timeout', () => {
      finish(new Error(`Redis health check timed out after ${checkTimeoutMs}ms`));
    });
    socket.once('error', finish);
  });
};

const checkRustFs = async (): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, checkTimeoutMs);

  try {
    const response = await fetch(env.storage.endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (response.status >= 500) {
      throw new Error(`RustFS returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const checkGalapagos = async (): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, checkTimeoutMs);

  try {
    const response = await fetch(env.galapagos.endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (response.status >= 500) {
      throw new Error(`Galapagos returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const checkNetLogoServices = async (): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, checkTimeoutMs);

  try {
    const response = await fetch(`${env.netlogoServices.endpoint}/preview`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (response.status >= 500) {
      throw new Error(`NetLogo Services returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

export const checkServicesHealth = async (log: FastifyBaseLogger): Promise<void> => {
  if (!env.isDevelopment) return;

  const checks: Array<HealthCheck> = [
    { name: 'postgres', run: checkPostgres, optional: false },
    { name: 'rustfs', run: checkRustFs, optional: false },
    { name: 'redis', run: checkRedis, optional: true },
    { name: 'galapagos', run: checkGalapagos, optional: true },
    { name: 'netlogoServices', run: checkNetLogoServices, optional: true },
  ];

  log.info({ name: 'healthcheck', msg: 'Checking development service health' });

  const results = await Promise.allSettled(
    checks.map(async (check) => {
      await check.run();
      return check.name;
    }),
  );

  type FailedCheck = { name: string; reason: string };
  const failedChecks: Array<FailedCheck> = [];
  const failedOptionalChecks: Array<FailedCheck> = [];
  results.forEach((result, index) => {
    const check = checks[index] as HealthCheck;
    if (result.status === 'fulfilled') {
      log.info({ name: check.name ?? 'unknown' }, `${check.name} is healthy`);
      return;
    }

    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    log.warn({ name: check.name ?? 'unknown', reason }, ` Health check failed for ${check.name}`);
    if (!check.optional) {
      failedChecks.push({ name: check.name, reason });
    } else {
      failedOptionalChecks.push({ name: check.name, reason });
    }
  });

  if (failedChecks.length > 0) {
    throw new Error(`Service check failed: ${failedChecks.map(({ name }) => name).join(', ')}`);
  }

  if (failedOptionalChecks.length > 0) {
    log.warn({
      name: 'optional-services',
      reason: `Some optional services failed`,
      msg: failedOptionalChecks,
    });
  }
  log.info('All required development services are healthy.');
};
