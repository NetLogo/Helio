// @ts-expect-error IDE error because of ESM and CJS support
// Ignoring because it only conflicts when the IDE tries to make
// sense of both module systems at the same time.
import '@types/jest';

declare global {
  const jest: typeof import('jest');
  const describe: jest.Describe;
  const it: jest.It;
  const test: jest.It;
  const expect: jest.Expect;
  // @ts-expect-error IDE error because of ESM and CJS support
  const beforeEach: jest.LifeCycleMethod;
  // @ts-expect-error IDE error because of ESM and CJS support
  const afterEach: jest.LifeCycleMethod;
  // @ts-expect-error IDE error because of ESM and CJS support
  const beforeAll: jest.LifeCycleMethod;
  // @ts-expect-error IDE error because of ESM and CJS support
  const afterAll: jest.LifeCycleMethod;
}
