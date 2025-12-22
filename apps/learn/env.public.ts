const publicEnvironmentVariablesKeys = ['PRODUCT_NAME', 'PRODUCT_WEBSITE', 'NO_AUTOGEN'] as const;

const NOT_REQUIRED_ENV_VARS = new Set(['NO_AUTOGEN']);

const publicEnvironmentVariables = Object.fromEntries(
  publicEnvironmentVariablesKeys.map((key) => [key, process.env[key]]),
);

export function verifyEnvironmentVariables() {
  for (const key of publicEnvironmentVariablesKeys) {
    if (NOT_REQUIRED_ENV_VARS.has(key)) continue;
    const res = process.env[key];
    if (!res || res.length === 0) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const productWebsite = process.env['PRODUCT_WEBSITE'] as string;
  if (productWebsite.endsWith('/')) {
    throw new Error(`PRODUCT_WEBSITE must not end with a slash: ${productWebsite}`);
  }
  if (!/^https?:\/\//.test(productWebsite)) {
    throw new Error(`PRODUCT_WEBSITE must start with http:// or https://: ${productWebsite}`);
  }
}

export { publicEnvironmentVariables };
