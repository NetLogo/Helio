export type Model = ResponseSuccessData<"GET", "/api/v1/models/{id}">;
export type ModelCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/card">;
export type ModelCardsPage = ResponseSuccessData<"GET", "/api/v1/models/card">;
export type ModelFamilyCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/family/card">;
export type AdditionalFile = ResponseSuccessData<
  "GET",
  "/api/v1/models/{id}/additional-files"
>[number];
export type ModelVersion = ResponseSuccessData<
  "GET",
  "/api/v1/models/{id}/versions"
>["data"][number];
export type ModelVersionCard = ResponseSuccessData<
  "GET",
  "/api/v1/models/{id}/versions/{version}/card"
>;
export type UserModelPermissions = ResponseSuccessData<"GET", "/api/v1/models/{id}/me/permissions">;
export type RandomModel = ResponseSuccessData<"GET", "/api/v1/models/random">;
export type ModelsQuery = QueryParams<"GET", "/api/v1/models/card">;
export type ModelsFilters = Omit<ModelsQuery, "limit" | "page">;
export type ModelSortBy = NonNullable<ModelsFilters["sortBy"]>;
export type ModelOrder = NonNullable<ModelsFilters["order"]>;
export type ModelDateRangeKey = Extract<keyof ModelsFilters, "fromDate" | "toDate">;
