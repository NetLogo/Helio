export type Tag = ResponseSuccessData<"GET", "/api/v1/tags">["data"][number];
export type TagsPage = ResponseSuccessData<"GET", "/api/v1/tags">;
export type TagDetail = ResponseSuccessData<"GET", "/api/v1/tags/{idOrName}">;
export type PopularTagsPage = ResponseSuccessData<"GET", "/api/v1/tags/popular">;
export type PopularTag = PopularTagsPage["data"][number];
