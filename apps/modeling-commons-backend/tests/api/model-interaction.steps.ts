import assert from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import { type TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  if (!context['models']) context['models'] = new Map<string, string>();
  return context['models'] as Map<string, string>;
}

// View interactions dedupe on userId OR sessionId OR cookie OR ipHash within a
// window. server.inject() gives every request the same req.ip, so without a
// distinct trusted IP per actor a second user's view collapses into the first
// by ipHash. Hand each actor a stable, distinct x-forwarded-for (the app's
// first trusted IP header) so distinct viewers produce distinct view rows.
function ipForActor(context: Record<string, unknown>, actorName: string): string {
  if (!context['actorIps']) context['actorIps'] = new Map<string, string>();
  const ips = context['actorIps'] as Map<string, string>;
  let ip = ips.get(actorName);
  if (!ip) {
    ip = `10.10.0.${ips.size + 1}`;
    ips.set(actorName, ip);
  }
  return ip;
}

const KIND_TO_PATH: Record<string, string> = {
  view: 'views',
  run: 'runs',
  download: 'downloads',
  share: 'shares',
};

function pathFor(kind: string): string {
  const segment = KIND_TO_PATH[kind];
  if (!segment) throw new Error(`Unknown interaction kind: ${kind}`);
  return segment;
}

When(
  'an anonymous viewer records a {string} interaction on {string}',
  async function (this: ICustomWorld, kind: string, modelTitle: string) {
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/${pathFor(kind)}`,
      payload: {},
      headers: { 'content-type': 'application/json' },
    });
  },
);

When(
  '{string} records a {string} interaction on {string}',
  async function (this: ICustomWorld, actorName: string, kind: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/${pathFor(kind)}`,
      payload: {},
      headers: {
        cookie: actor.cookie,
        'content-type': 'application/json',
        'x-forwarded-for': ipForActor(this.context, actorName),
      },
    });
  },
);

When(
  '{string} gets the interactions summary for {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/interactions`,
      headers: { cookie: actor.cookie },
    });
  },
);

Then(
  'the interactions summary {string} should be {int}',
  function (this: ICustomWorld, key: string, expected: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.strictEqual(body[key], expected, `Expected ${key} to be ${expected}, got ${body[key]}`);
  },
);

When(
  '{string} gets the card for model {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/card`,
      headers: { cookie: actor.cookie },
    });
  },
);
