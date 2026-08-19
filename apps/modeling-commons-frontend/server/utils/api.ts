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

// No cookie is forwarded, so the API answers as it would to any crawler. Every
// caller of this is generating something public by definition; sending along
// whoever happened to trigger the request would widen the result set to their
// private records.
export function makeAnonymousClient(): Client<paths> {
  return createClient<paths>({
    baseUrl: useRuntimeConfig().public.apiBase as string,
  });
}
