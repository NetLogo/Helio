import type { ErrorStatus, HttpMethod, OkStatus } from "openapi-typescript-helpers";
import type { paths } from "~~/shared/types/api";

export type QueryParams<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
> = paths[P][Lowercase<M>] extends {
  parameters: { query?: infer Q };
}
  ? Q
  : never;

export type Headers<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
> = paths[P][Lowercase<M>] extends {
  parameters: { header?: infer H };
}
  ? H
  : never;

export type RequestBody<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
  ContentType extends string = `${string}/json`,
> = paths[P][Lowercase<M>] extends {
  requestBody?: infer R;
}
  ? R extends { content: { [key in ContentType]?: infer B } }
    ? B
    : never
  : never;

export type ResponseData<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
  ContentType extends string = `${string}/json`,
  StatusCode extends OkStatus | ErrorStatus = OkStatus,
> = paths[P][Lowercase<M>] extends {
  responses: infer R;
}
  ? R extends { [K in StatusCode]?: infer S }
    ? S extends { content?: { [key in ContentType]?: infer D } }
      ? D
      : never
    : never
  : never;

export type ResponseSuccessData<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
  ContentType extends string = `${string}/json`,
> = ResponseData<M, P, ContentType, OkStatus>;

export type ResponseErrorData<
  M extends Uppercase<HttpMethod>,
  P extends keyof paths,
  ContentType extends string = `${string}/json`,
> = ResponseData<M, P, ContentType, ErrorStatus>;
