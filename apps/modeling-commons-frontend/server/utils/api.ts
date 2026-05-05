import type { H3Event } from "h3";
import createClient, { type Client } from "openapi-fetch";
import type { paths } from "~~/shared/types/api";

export function makeServerClient(event: H3Event): Client<paths> {
  const cookie = event.node.req.headers.cookie || "";
  return createClient<paths>({
    baseUrl: useRuntimeConfig().public.apiBase as string,
    credentials: "include",
    headers: {
      cookie,
    },
  });
}
