import { After, AfterAll, Before, BeforeAll, type ITestCaseHookParameter, setDefaultTimeout } from '@cucumber/cucumber';
import type { FastifyInstance } from 'fastify';
import type { ICustomWorld } from './custom-world.ts';
import { buildApp } from './server.ts';
import { cleanDatabase } from './db-helper.ts';
import {
  attachScenarioTag,
  isTimingEnabled,
  setActiveScenario,
  writeReport,
} from './timing-collector.ts';

setDefaultTimeout(process.env['PWDEBUG'] ? -1 : 60 * 1000);

let sharedServer: FastifyInstance;

BeforeAll(async function () {
  sharedServer = await buildApp();
});

AfterAll(async function () {
  if (sharedServer) {
    await sharedServer.close();
  }
  if (isTimingEnabled()) {
    writeReport('reports/timing.md', 'reports/timing.json');
  }
});

// Note: "pickle" below is a Cucumber concept (test case), not Python's pickle module.

Before({ tags: '@pending' }, () => 'skipped' as unknown as undefined);

Before({ tags: '@debug' }, function (this: ICustomWorld) {
  this.debug = true;
});

Before(async function (this: ICustomWorld, hookParam: ITestCaseHookParameter) {
  const scenarioCase = hookParam.pickle;
  this.startTime = new Date();
  this.testName = scenarioCase.name.replaceAll(/\W/g, '-');
  this.feature = scenarioCase;
  this.context = {};
  this.server = sharedServer;
  if (isTimingEnabled()) {
    setActiveScenario(scenarioCase.name);
  }
});

// Truncation is scoped by tag so that it is unreachable from the
// @data-integrity cohort, which runs against populated environments including
// production. Keeping it in a separate hook means a tagging mistake cannot
// silently reintroduce it: the two hooks' tag expressions are complements.
Before({ tags: 'not @data-integrity' }, async function (this: ICustomWorld) {
  await cleanDatabase(this.server);
});

Before({ tags: '@data-integrity' }, async function (this: ICustomWorld) {
  const { prisma } = this.server.diContainer.cradle as {
    prisma: { model: { count: () => Promise<number> }; user: { count: () => Promise<number> } };
  };
  const [models, users] = await Promise.all([prisma.model.count(), prisma.user.count()]);
  if (models === 0 && users === 0) {
    throw new Error(
      'no data to check: the @data-integrity cohort asserts invariants over an existing dataset, ' +
        'and an empty database would pass every one of them vacuously. Point DATABASE_URL at a populated environment.',
    );
  }
});

After(async function (this: ICustomWorld, hookParam: ITestCaseHookParameter) {
  const { result } = hookParam;
  const scenarioCase = hookParam.pickle;
  if (result) {
    this.attach(`Status: ${result.status}. Duration:${result.duration.seconds}s`);
  }
  if (isTimingEnabled()) {
    const durationMs = result?.duration
      ? result.duration.seconds * 1000 + result.duration.nanos / 1e6
      : 0;
    attachScenarioTag({
      name: scenarioCase.name,
      status: result?.status ?? 'UNKNOWN',
      durationMs,
    });
    setActiveScenario(undefined);
  }
});
