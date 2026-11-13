import type { QueryKey } from "@repo/utils/lib/http/query";

const z = await import("zod");

export const modelSortByValues = [
  "recent",
  "views",
  "downloads",
  "runs",
  "likes",
] as const satisfies Readonly<Array<ModelSortBy>>;
export const modelSortByValidator = z.enum(modelSortByValues);

export const modelOrderValues = ["asc", "desc"] as const satisfies Readonly<Array<ModelOrder>>;
export const modelOrderValidator = z.enum(modelOrderValues);

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
