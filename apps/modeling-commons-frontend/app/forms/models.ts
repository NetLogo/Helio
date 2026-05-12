import type { QueryKey } from "@repo/utils/lib/http/query";
import * as z from "zod";

export type ModelsQuery = QueryParams<"GET", "/api/v1/models/card">;
export type ModelsFilters = Omit<ModelsQuery, "limit" | "page">;
type ApiModelSortBy = NonNullable<ModelsFilters["sortBy"]>;

export const modelsPageLimit = 20;
export const modelKeywordDebounceMs = 300;

export const modelSortByValues = [
  "recent",
  "views",
  "downloads",
  "runs",
  "likes",
] as const satisfies Readonly<Array<ApiModelSortBy>>;
export const modelSortByValidator = z.enum(modelSortByValues);
export type ModelSortBy = z.infer<typeof modelSortByValidator>;

export const modelSortByOptions = [
  { label: "Date Published", value: "recent" },
  { label: "Likes", value: "likes" },
  { label: "Views", value: "views" },
  { label: "Downloads", value: "downloads" },
] as const satisfies ReadonlyArray<{ label: string; value: ModelSortBy }>;

export const modelOrderValues = ["asc", "desc"] as const;
export const modelOrderValidator = z.enum(modelOrderValues);
export type ModelOrder = z.infer<typeof modelOrderValidator>;

export const modelOrderIcons: Record<ModelOrder, string> = {
  asc: "i-lucide-arrow-up-narrow-wide",
  desc: "i-lucide-arrow-down-narrow-wide",
};

export const modelsQueryFilters = [
  { key: "keyword", type: "string", defaultValue: "" },
  { key: "tags", type: "array", contentType: { key: "tag", type: "string" } },
  { key: "isEndorsed", type: "boolean" },
  { key: "isLibraryModel", type: "boolean" },
  { key: "sortBy", type: "string" },
  { key: "order", type: "string", defaultValue: "desc" },
  { key: "fromDate", type: "string" },
  { key: "toDate", type: "string" },
  { key: "authorId", type: "string" },
  { key: "parentModelId", type: "string" },
  { key: "publicOnly", type: "boolean" },
  { key: "netlogoVersion", type: "string" },
] as const satisfies Array<QueryKey>;

export const modelsQuerySchema = z.object({
  limit: z.number(),
  page: z.number(),
  keyword: z.string().default(""),
  tags: z.array(z.string()).default([]),
  sortBy: modelSortByValidator.optional(),
  order: modelOrderValidator.default("desc"),
  authorId: z.string().optional(),
  parentModelId: z.string().optional(),
  publicOnly: z.boolean().optional(),
  isEndorsed: z.boolean().optional(),
  isLibraryModel: z.boolean().optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  netlogoVersion: z.string().optional(),
});

export const modelTypeFilterOptions = [
  { key: "isLibraryModel", label: "NetLogo Library" },
  { key: "isEndorsed", label: "Endorsed by NetLogo" },
] as const satisfies ReadonlyArray<{ key: keyof ModelsFilters; label: string }>;

export const modelDateRangeKeys = ["fromDate", "toDate"] as const;
export type ModelDateRangeKey = (typeof modelDateRangeKeys)[number];

export const modelsIndexSeoMeta = {
  title: "Explore Models",
  description: "Browse and discover agent-based simulations shared by the NetLogo community.",
  ogTitle: "Explore Models",
  ogDescription: "Browse and discover agent-based simulations shared by the NetLogo community.",
};
