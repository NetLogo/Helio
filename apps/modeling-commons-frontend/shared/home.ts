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
}

export const homeSections: HomeSection[] = [
  {
    key: "featured",
    title: "Featured Models",
    subtitle: "Community-endorsed simulations",
    query: { limit: 8, isEndorsed: true },
    viewAllTo: "/featured-models",
  },
  {
    key: "recent",
    title: "Recent Models",
    subtitle: "Latest uploads from the community",
    query: { limit: 8 },
    viewAllTo: "/new-models",
  },
  {
    key: "most-viewed",
    title: "Most Viewed Models",
    subtitle: "What the community keeps coming back to",
    query: { limit: 6, sortBy: "views" },
    viewAllTo: "/models?sortBy=views",
  },
  {
    key: "most-downloaded",
    title: "Most Downloaded Models",
    subtitle: "Top picks people are taking offline",
    query: { limit: 4, sortBy: "downloads" },
    viewAllTo: "/models?sortBy=downloads",
  },
  {
    key: "most-liked",
    title: "Most Liked Models",
    subtitle: "Crowd favorites",
    query: { limit: 4, sortBy: "likes" },
    viewAllTo: "/models?sortBy=likes",
  },
];

export const homeTagsLimit = 6;
export const homeTagsWindowDays = 14;

export const homeFeedPath = "/_data/home";
export const homeFeedMaxAgeSeconds = 60 * 45;
