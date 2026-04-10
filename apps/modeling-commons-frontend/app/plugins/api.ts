import { initApi } from "~/composables/useApi";

export default defineNuxtPlugin(() => {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  initApi(apiBase);
});
