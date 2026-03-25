import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  return context['users'] as Map<string, TestUser>;
}

function getModels(context: Record<string, unknown>): Map<string, string> {
  return context['models'] as Map<string, string>;
}

When(
  '{string} grants {string} permission on {string} to {string}',
  async function (
    this: ICustomWorld,
    granterName: string,
    level: string,
    modelTitle: string,
    granteeName: string,
  ) {
    const granter = getUsers(this.context).get(granterName)!;
    const grantee = getUsers(this.context).get(granteeName)!;
    const modelId = getModels(this.context).get(modelTitle)!;

    this.context.latestResponse = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/permissions`,
      payload: { granteeUserId: grantee.id, permissionLevel: level },
      headers: { cookie: granter.cookie, 'content-type': 'application/json' },
    });
  },
);

Given(
  '{string} has granted {string} permission on {string} to {string}',
  async function (
    this: ICustomWorld,
    granterName: string,
    level: string,
    modelTitle: string,
    granteeName: string,
  ) {
    const granter = getUsers(this.context).get(granterName)!;
    const grantee = getUsers(this.context).get(granteeName)!;
    const modelId = getModels(this.context).get(modelTitle)!;

    const res = await this.server.inject({
      method: 'POST',
      url: `/api/v1/models/${modelId}/permissions`,
      payload: { granteeUserId: grantee.id, permissionLevel: level },
      headers: { cookie: granter.cookie, 'content-type': 'application/json' },
    });

    if (res.statusCode !== 201) {
      throw new Error(`Failed to grant permission (${res.statusCode}): ${res.body}`);
    }
  },
);

When(
  '{string} lists permissions on {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;

    this.context.latestResponse = await this.server.inject({
      method: 'GET',
      url: `/api/v1/models/${modelId}/permissions`,
      headers: { cookie: actor.cookie },
    });
  },
);

When(
  '{string} revokes permission on {string} from {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, targetName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const target = getUsers(this.context).get(targetName)!;
    const modelId = getModels(this.context).get(modelTitle)!;

    this.context.latestResponse = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/permissions/${target.id}`,
      headers: { cookie: actor.cookie },
    });
  },
);

Given(
  '{string} has revoked permission on {string} from {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, targetName: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const target = getUsers(this.context).get(targetName)!;
    const modelId = getModels(this.context).get(modelTitle)!;

    const res = await this.server.inject({
      method: 'DELETE',
      url: `/api/v1/models/${modelId}/permissions/${target.id}`,
      headers: { cookie: actor.cookie },
    });
    if (res.statusCode !== 204) {
      throw new Error(`Failed to revoke permission (${res.statusCode}): ${res.body}`);
    }
  },
);

When(
  '{string} updates the model {string} with visibility {string}',
  async function (this: ICustomWorld, actorName: string, modelTitle: string, visibility: string) {
    const actor = getUsers(this.context).get(actorName)!;
    const modelId = getModels(this.context).get(modelTitle)!;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: `/api/v1/models/${modelId}`,
      payload: { visibility },
      headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    });
  },
);
