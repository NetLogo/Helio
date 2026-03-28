import type { paths } from "~~/shared/types/api";
import createClient from "openapi-fetch";

export function useApi() {
  const apiBase = useRuntimeConfig().public.apiBase;
  const apiClient = createClient<paths>({
    baseUrl: apiBase,
  });
  return apiClient;
}
