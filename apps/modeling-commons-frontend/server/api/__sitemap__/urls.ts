import type { SitemapUrlInput } from "#sitemap/types";
import type { paths } from "~~/shared/types/api";

const PAGE_SIZE = 100;
const MAX_PAGES = 200; // <50K
const TIMEOUT_MS = 10_000;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

type JsonOk<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: { content: { "application/json": infer C } } } };
}
  ? C
  : never;

type ModelCard = JsonOk<"/api/v1/models/card">["data"][number];
type TagRecord = JsonOk<"/api/v1/tags">["data"][number];

export default defineSitemapEventHandler(async (): Promise<SitemapUrlInput[]> => {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  if (!apiBase) {
    console.error("[sitemap] public.apiBase is empty; no dynamic urls will be emitted");
    return [];
  }

  const api = makeAnonymousClient();

  const models: ModelCard[] = [];
  // Pagination is zero-indexed: the API computes its offset as page * limit, so
  // starting at 1 would skip the first page.
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await api.GET("/api/v1/models/card", {
      params: { query: { limit: PAGE_SIZE, page, publicOnly: true } },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (error || !data) {
      console.error(`[sitemap] model page ${page} failed:`, error);
      break;
    }

    models.push(...data.data);
    if (data.data.length < PAGE_SIZE) break;
  }

  const { data: tagPage, error: tagError } = await api.GET("/api/v1/tags", {
    params: { query: { limit: PAGE_SIZE, page: 0 } },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (tagError) console.error("[sitemap] tag listing failed:", tagError);
  const tags: TagRecord[] = tagPage?.data ?? [];

  const modelUrls: SitemapUrlInput[] = models.map((card) => ({
    loc: `/models/${card.model.id}`,
    lastmod: card.model.updatedAt,
  }));

  // Roughly 8% of the tags carried over from the legacy site have a stray
  // control character in the name (backspace, delete and friends). They
  // percent-encode into valid but junk URLs, so keep them out of the index
  // rather than advertise them.
  const tagUrls: SitemapUrlInput[] = tags
    .filter((tag) => !CONTROL_CHARS.test(tag.name))
    .map((tag) => ({ loc: `/tags/${encodeURIComponent(tag.name)}` }));

  console.log(
    `[sitemap] ${models.length} models fetched -> ${modelUrls.length} urls; ` +
      `${tags.length} tags -> ${tagUrls.length} urls`,
  );

  return [...modelUrls, ...tagUrls];
});
