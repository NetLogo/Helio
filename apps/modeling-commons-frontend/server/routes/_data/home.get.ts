import {
  homeFeedMaxAgeSeconds,
  homeFeedSections,
  homeTagsLimit,
  homeTagsWindowDays,
  type HomeFeed,
  type HomeModelCard,
  type HomePopularTag,
} from "~~/shared/home";

// The home feed is identical for every visitor, so it is fetched without the
// request's cookies and cached once for all of them. Nitro's cached handler
// strips everything but the `varies` headers before invoking this, so there is
// no session here to leak into the shared entry even by accident.
export default defineCachedEventHandler(
  async (): Promise<HomeFeed> => {
    const apiBase = useRuntimeConfig().public.apiBase as string;

    const windowStart = new Date(Date.now() - homeTagsWindowDays * 24 * 60 * 60 * 1000);
    const fromDate = windowStart.toISOString().split("T")[0];

    const [sections, tags] = await Promise.all([
      Promise.all(
        homeFeedSections.map(async (section) => {
          const response = await $fetch<{ data: HomeModelCard[] }>(
            `${apiBase}/api/v1/models/card`,
            { query: section.query },
          );
          return [section.key, response?.data ?? []] as const;
        }),
      ),
      $fetch<{ data: HomePopularTag[] }>(`${apiBase}/api/v1/tags/popular`, {
        query: { limit: homeTagsLimit, fromDate },
      }),
    ]);

    return {
      sections: Object.fromEntries(sections.filter(([, cards]) => cards.length > 0)),
      tags: tags?.data ?? [],
    };
  },
  {
    name: "home-feed",
    getKey: () => "home-feed",
    maxAge: homeFeedMaxAgeSeconds,
    swr: true,
  },
);
