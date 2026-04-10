import createClient, { type Client } from "openapi-fetch";
import type { paths } from "~~/shared/types/api";

let apiClient: Client<paths> | null = null;

export function initApi(baseUrl: string) {
  apiClient = createClient<paths>({
    baseUrl,
    credentials: "include",
  });
}

export function useApi() {
  if (!apiClient) {
    throw new Error("API client not initialized. Ensure the api plugin has loaded.");
  }
  return apiClient;
}
