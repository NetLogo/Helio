import assert from 'node:assert';
import { Then } from '@cucumber/cucumber';
import type { ICustomWorld } from '../support/custom-world.ts';

Then(
  /^I receive an error "(.*)" with status code (\d+)$/,
  async function (this: ICustomWorld, errorMessage: string, statusCode: string) {
    assert.strictEqual(this.context.latestResponse!.statusCode, +statusCode);
    assert.strictEqual(this.context.latestResponse!.statusMessage, errorMessage);
  },
);

Then('the response status should be {int}', function (this: ICustomWorld, statusCode: number) {
  assert.strictEqual(this.context.latestResponse!.statusCode, statusCode);
});

Then(
  'the response body should have property {string}',
  function (this: ICustomWorld, property: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(property in body, `Expected property "${property}" in response body`);
  },
);

Then(
  'the response body property {string} should equal {string}',
  function (this: ICustomWorld, property: string, expected: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.strictEqual(String(body[property]), expected);
  },
);

Then(
  'the response body should be an array',
  function (this: ICustomWorld) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(Array.isArray(body), 'Expected response body to be an array');
  },
);

Then(
  'the response body should have property {string} as an array',
  function (this: ICustomWorld, property: string) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.ok(Array.isArray(body[property]), `Expected "${property}" to be an array`);
  },
);

Then(
  'the response body property {string} should have length {int}',
  function (this: ICustomWorld, property: string, length: number) {
    const body = JSON.parse(this.context.latestResponse!.body);
    assert.strictEqual(body[property].length, length);
  },
);
