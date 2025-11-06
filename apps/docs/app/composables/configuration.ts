function getEnvironmentVariable<T>(key: string, defaultValue: T, showWarning: boolean = true): T {
  const { public: config } = useRuntimeConfig();
  const value = (config[key] as T | undefined) ?? (process.env[key] as T | undefined);

  if (showWarning && !value) {
    console.warn(`Environment variable ${key} is not set. Using default value: ${defaultValue}`);
  }

  return value ?? defaultValue;
}

function useProductInfo() {
  return {
    productName: getEnvironmentVariable<string>('PRODUCT_NAME', 'NetLogo Documentation'),
    productVersion: getEnvironmentVariable<string>('PRODUCT_VERSION', '7.0.3'),
    productDisplayName: getEnvironmentVariable<string>('PRODUCT_DISPLAY_NAME', '7.0.3'),
    productBuildDate: getEnvironmentVariable<string>('PRODUCT_BUILD_DATE', new Date().toISOString()),
    productWebsite: getEnvironmentVariable<string>('PRODUCT_WEBSITE', 'https://docs.netlogo.org'),
    isBeta: getEnvironmentVariable<string>('PRODUCT_VERSION', '7.0.3').toLowerCase().includes('beta'),
  };
}

function useRuntimeInfo() {
  const productInfo = useProductInfo();
  return {
    noAutogen: getEnvironmentVariable<string>('NO_AUTOGEN', 'false', false),
    versionsSrc: productInfo.productWebsite + getEnvironmentVariable<string>('VERSIONS_SRC', '/versions.json'),
  };
}

export { getEnvironmentVariable, useProductInfo, useRuntimeInfo };
