import WebsiteMeta from "~/assets/website-meta.json";

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
    productName: getEnvironmentVariable<string>("PRODUCT_NAME", WebsiteMeta.name),
    productWebsite: getEnvironmentVariable<string>("PRODUCT_WEBSITE", WebsiteMeta.url),
  };
}

function useRuntimeInfo() {
  return {
    noAutogen: getEnvironmentVariable<string>("NO_AUTOGEN", "false", false),
  };
}

export { getEnvironmentVariable, useProductInfo, useRuntimeInfo };
