import type { LaunchOptions } from 'puppeteer';

type EnvironmentName = 'github-actions' | 'default';
type EnvironmentOptions = {
  environmentName: EnvironmentName;
  launch: LaunchOptions;
  test: () => boolean;
  beforeAll: () => Promise<void>;
  timeout: number;
};

export type { EnvironmentName, EnvironmentOptions };
