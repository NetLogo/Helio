import type { paths } from "~~/shared/types/api";

type ModelCardQuery = NonNullable<
  paths["/api/v1/models/card"]["get"]["parameters"]["query"]
>;

type OkJson<T> = T extends {
  responses: { 200: { content: { "application/json": infer D } } };
}
  ? D
  : never;

export type HomeModelCard = OkJson<paths["/api/v1/models/{id}/card"]["get"]>;
export type HomePopularTag = OkJson<paths["/api/v1/tags/popular"]["get"]>["data"][number];

export interface HomeFeed {
  sections: Record<string, HomeModelCard[]>;
  tags: HomePopularTag[];
}

export interface HomeSection {
  key: string;
  title: string;
  subtitle: string;
  query: ModelCardQuery;
  viewAllTo: string;
  // Fetched by its own endpoint on its own TTL rather than by the shared feed.
  deferred?: boolean;
}

const featured: HomeSection = {
  key: "featured",
  title: "Featured Models",
  subtitle: "Community-endorsed simulations",
  query: { limit: 8, isEndorsed: true },
  viewAllTo: "/featured-models",
};

const mostViewed: HomeSection = {
  key: "most-viewed",
  title: "Most Viewed Models",
  subtitle: "What the community keeps coming back to",
  query: { limit: 6, sortBy: "views" },
  viewAllTo: "/models?sortBy=views",
};

const mostDownloaded: HomeSection = {
  key: "most-downloaded",
  title: "Most Downloaded Models",
  subtitle: "Top picks people are taking offline",
  query: { limit: 4, sortBy: "downloads" },
  viewAllTo: "/models?sortBy=downloads",
};

const mostLiked: HomeSection = {
  key: "most-liked",
  title: "Most Liked Models",
  subtitle: "Crowd favorites",
  query: { limit: 4, sortBy: "likes" },
  viewAllTo: "/models?sortBy=likes",
};

// Recents go stale far faster than the rest of the feed, so they are fetched
// and cached on their own rather than riding the long-lived feed TTL.
export const homeRecentSection: HomeSection = {
  key: "recent",
  title: "Recent Models",
  subtitle: "Latest uploads from the community",
  query: { limit: 8 },
  viewAllTo: "/new-models",
  deferred: true,
};

// Render order.
export const homeSections: HomeSection[] = [
  featured,
  homeRecentSection,
  mostViewed,
  mostDownloaded,
  mostLiked,
];

// Derived, not hand-listed: a section added above is fetched by the shared feed
// unless it declares its own endpoint, so the two can never drift apart.
export const homeFeedSections: HomeSection[] = homeSections.filter((s) => !s.deferred);

export const homeTagsLimit = 6;
export const homeTagsWindowDays = 14;

export const homeFeedPath = "/_data/home";
export const homeFeedMaxAgeSeconds = 60 * 45;

export const homeRecentPath = "/_data/home-recent";
export const homeRecentMaxAgeSeconds = 60;

export interface HomeRecentFeed {
  cards: HomeModelCard[];
}
