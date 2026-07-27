import assert from 'node:assert';
import { Then, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';
import type { TestUser } from '../support/auth-helper.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';

// The real catalog, not a copy, keeps this suite honest about which categories
// exist without asserting on their label/description copy.
const KNOWN_CATEGORIES = userNotificationDomain().categories.map((c) => c.category);

type CategoryPreference = {
  category: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
};

function getUsers(context: Record<string, unknown>): Map<string, TestUser> {
  if (!context['users']) context['users'] = new Map<string, TestUser>();
  return context['users'] as Map<string, TestUser>;
}

function getSnapshots(context: Record<string, unknown>): Map<string, Array<CategoryPreference>> {
  if (!context['notificationSnapshots']) context['notificationSnapshots'] = new Map();
  return context['notificationSnapshots'] as Map<string, Array<CategoryPreference>>;
}

function findCategory(list: Array<CategoryPreference>, category: string): CategoryPreference {
  const found = list.find((entry) => entry.category === category);
  assert.ok(found, `category "${category}" missing from response`);
  return found;
}

When(
  '{string} gets their notification preferences',
  async function (this: ICustomWorld, name: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    const response = await this.server.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { cookie: user.cookie },
    });
    this.context.latestResponse = response;

    const snapshots = getSnapshots(this.context);
    if (response.statusCode === 200 && !snapshots.has(name)) {
      const body = JSON.parse(response.body) as { categories: Array<CategoryPreference> };
      snapshots.set(name, body.categories);
    }
  },
);

When(
  '{string} turns off email for category {string}',
  async function (this: ICustomWorld, name: string, category: string) {
    const user = getUsers(this.context).get(name)!;
    this.context['lastNotificationUser'] = name;
    this.context['lastTouchedCategory'] = category;
    this.context.latestResponse = await this.server.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      payload: { preferences: [{ category, email: false }] },
      headers: { cookie: user.cookie, 'content-type': 'application/json' },
    });
  },
);

When('an anonymous viewer gets notification preferences', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: '/api/v1/me/notification-preferences',
  });
});

When('an anonymous viewer updates notification preferences', async function (this: ICustomWorld) {
  this.context.latestResponse = await this.server.inject({
    method: 'PATCH',
    url: '/api/v1/me/notification-preferences',
    payload: { preferences: [{ category: KNOWN_CATEGORIES[0], email: false }] },
    headers: { 'content-type': 'application/json' },
  });
});

Then(
  'the notification preferences response should list every known category',
  function (this: ICustomWorld) {
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    const returned = body.categories.map((entry) => entry.category).sort();
    assert.deepStrictEqual(returned, [...KNOWN_CATEGORIES].sort());
    for (const entry of body.categories) {
      assert.strictEqual(typeof entry.email, 'boolean');
      assert.strictEqual(typeof entry.inApp, 'boolean');
    }
  },
);

Then('category {string} should have email false', function (this: ICustomWorld, category: string) {
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  const entry = findCategory(body.categories, category);
  assert.strictEqual(entry.email, false);
});

Then(
  'category {string} should have the same inApp value as before',
  function (this: ICustomWorld, category: string) {
    const name = this.context['lastNotificationUser'] as string;
    const before = findCategory(getSnapshots(this.context).get(name)!, category);
    const body = JSON.parse(this.context.latestResponse!.body) as {
      categories: Array<CategoryPreference>;
    };
    const after = findCategory(body.categories, category);
    assert.strictEqual(after.inApp, before.inApp);
  },
);

Then('every other category should be unchanged from before', function (this: ICustomWorld) {
  const name = this.context['lastNotificationUser'] as string;
  const touched = this.context['lastTouchedCategory'] as string | undefined;
  const before = getSnapshots(this.context).get(name)!;
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  for (const beforeEntry of before) {
    if (beforeEntry.category === touched) continue;
    const afterEntry = findCategory(body.categories, beforeEntry.category);
    assert.strictEqual(afterEntry.email, beforeEntry.email);
    assert.strictEqual(afterEntry.inApp, beforeEntry.inApp);
  }
});

Then('every category should be unchanged from before', function (this: ICustomWorld) {
  const name = this.context['lastNotificationUser'] as string;
  const before = getSnapshots(this.context).get(name)!;
  const body = JSON.parse(this.context.latestResponse!.body) as {
    categories: Array<CategoryPreference>;
  };
  for (const beforeEntry of before) {
    const afterEntry = findCategory(body.categories, beforeEntry.category);
    assert.strictEqual(afterEntry.email, beforeEntry.email);
    assert.strictEqual(afterEntry.inApp, beforeEntry.inApp);
  }
});
