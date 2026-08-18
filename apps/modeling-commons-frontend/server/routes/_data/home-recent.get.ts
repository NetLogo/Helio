import {
  homeRecentMaxAgeSeconds,
  homeRecentSection,
  type HomeModelCard,
  type HomeRecentFeed,
} from "~~/shared/home";

// Split out of the shared home feed so newly published models surface within a
// minute instead of waiting on that feed's much longer TTL.
export default defineCachedEventHandler(
  async (): Promise<HomeRecentFeed> => {
    const apiBase = useRuntimeConfig().public.apiBase as string;

    const response = await $fetch<{ data: HomeModelCard[] }>(`${apiBase}/api/v1/models/card`, {
      query: homeRecentSection.query,
    });

    return { cards: response?.data ?? [] };
  },
  {
    name: "home-recent",
    getKey: () => "home-recent",
    maxAge: homeRecentMaxAgeSeconds,
    swr: true,
  },
);
