import { Given, When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';

Given('a tag {string} exists', async function (this: ICustomWorld, tagName: string) {
  const { prisma } = this.server.diContainer.cradle as {
    prisma: { tag: { create: Function } };
  };
  const tag = await prisma.tag.create({ data: { name: tagName } });
  if (!this.context['tags']) this.context['tags'] = new Map<string, string>();
  (this.context['tags'] as Map<string, string>).set(tagName, tag.id);
});

When('I get the tag {string}', async function (this: ICustomWorld, tagName: string) {
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url: `/api/v1/tags/${encodeURIComponent(tagName)}`,
  });
});
