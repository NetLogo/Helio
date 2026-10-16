import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "~~/shared/types/api";

let browserClient: Client<paths> | null = null;

export function initApi(baseUrl: string, middleware: Array<Middleware> = []) {
  if (import.meta.server) return;
  browserClient = createClient<paths>({
    baseUrl,
    credentials: "include",
  });
  browserClient.use(...middleware);
}

function makeServerClient(baseUrl: string): Client<paths> {
  const cookie = useRequestHeaders(["cookie"]).cookie;
  return createClient<paths>({
    baseUrl,
    credentials: "include",
    headers: cookie ? { cookie } : undefined,
  });
}

export function useApi(): Client<paths> {
  if (import.meta.server) {
    const baseUrl = useRuntimeConfig().public.apiBase as string;
    return makeServerClient(baseUrl);
  }
  if (!browserClient) {
    throw new Error("API client not initialized. Ensure the api plugin has loaded.");
  }
  return browserClient;
}
