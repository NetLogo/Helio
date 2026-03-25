import { When } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';

When('I send a GET request to {string}', async function (this: ICustomWorld, url: string) {
  const cookie = this.context['currentCookie'] as string | undefined;
  this.context.latestResponse = await this.server.inject({
    method: 'GET',
    url,
    ...(cookie ? { headers: { cookie } } : {}),
  });
});
