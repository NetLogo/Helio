import { initApi } from "~/composables/api/useApi";

export default defineNuxtPlugin(() => {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  initApi(apiBase);
});
