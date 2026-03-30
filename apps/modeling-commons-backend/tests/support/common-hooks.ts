import { After, AfterAll, Before, BeforeAll, type ITestCaseHookParameter, setDefaultTimeout } from '@cucumber/cucumber';
import type { FastifyInstance } from 'fastify';
import type { ICustomWorld } from './custom-world.ts';
import { buildApp } from './server.ts';
import { cleanDatabase } from './db-helper.ts';

setDefaultTimeout(process.env['PWDEBUG'] ? -1 : 60 * 1000);

let sharedServer: FastifyInstance;

BeforeAll(async function () {
  sharedServer = await buildApp();
});

AfterAll(async function () {
  if (sharedServer) {
    await sharedServer.close();
  }
});

// Note: "pickle" below is a Cucumber concept (test case), not Python's pickle module.

Before({ tags: '@pending' }, () => 'skipped' as unknown as undefined);

Before({ tags: '@debug' }, function (this: ICustomWorld) {
  this.debug = true;
});

Before(async function (this: ICustomWorld, { pickle }: ITestCaseHookParameter) {
  this.startTime = new Date();
  this.testName = pickle.name.replaceAll(/\W/g, '-');
  this.feature = pickle;
  this.context = {};
  this.server = sharedServer;
  await cleanDatabase(this.server);
});

After(async function (this: ICustomWorld, { result }: ITestCaseHookParameter) {
  if (result) {
    this.attach(`Status: ${result.status}. Duration:${result.duration.seconds}s`);
  }
});
