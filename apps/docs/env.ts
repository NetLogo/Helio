import { defined } from '@repo/utils/std/null';

const envVars = {
  productName: process.env['PRODUCT_NAME'],
  productVersion: process.env['PRODUCT_VERSION'],
  productBuildDate: process.env['PRODUCT_BUILD_DATE'],
  productWebsite: process.env['PRODUCT_WEBSITE'],

  repoRoot: process.env['REPO_ROOT'],
  extensionDir: process.env['EXTENSIONS_DIR'],
};

for (const [key, value] of Object.entries(envVars)) {
  if (!defined(value)) {
    throw new Error(`Environment variable ${key} is not set`);
  }
}

if ((envVars.productWebsite ?? '').endsWith('/')) {
  throw new Error(`Environment variable PRODUCT_WEBSITE must not end with a slash`);
}

const basePath = process.env['BASE_PATH'] ?? '';
if (basePath.length > 0 && !basePath.startsWith('/')) {
  throw new Error(`Environment variable BASE_PATH must be empty or start with a slash`);
}

/**
 * Environment variables used by the docs app.
 *
 * `productName`: The name of the product (e.g., "NetLogo").
 *
 * `productVersion`: The version of the product (e.g., "7.0.0").
 *
 * `productBuildDate`: The build date of the product in ISO 8601 format (e.g., "2024-01-01T00:00:00Z").
 *
 * `productWebsite`: The base URL of the product's website (e.g., "https://docs.netlogo.org").
 *
 * `repoRoot`: The root directory of the repository (e.g., "../..").
 *
 * `extensionDir`: The directory where extensions are located (e.g., "../../extensions").
 *
 * `basePath`: The base path for the application, used for routing (e.g., "" or "/7.0.0-beta2").
 *             Typically, you must expect the page to be served from either the root or the
 *             versioned path, and handle both cases.
 */
export const Env = {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  productName: envVars.productName!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  productVersion: envVars.productVersion!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  productBuildDate: envVars.productBuildDate!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  productWebsite: envVars.productWebsite!,

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  repoRoot: envVars.repoRoot!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  extensionDir: envVars.extensionDir!,

  basePath,
};
