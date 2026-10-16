import { initApi } from "~/composables/api/useApi";
import { connectionMiddleware } from "~/composables/shared/useConnectionHealth";

export default defineNuxtPlugin(() => {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  initApi(apiBase, [connectionMiddleware]);
});
