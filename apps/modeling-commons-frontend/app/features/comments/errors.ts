type ApiResult<T> = { data?: T; response: Response };

export function throwUnlessCommentRequestOk(response: Response, request: string): void {
  if (response.ok) return;
  throw new Error(
    fillTemplate(commentLiterals.requestFailed, { request, status: response.status }),
  );
}

export function getCommentResponseData<T>({ data, response }: ApiResult<T>, request: string): T {
  throwUnlessCommentRequestOk(response, request);
  if (data === undefined) {
    throw new Error(fillTemplate(commentLiterals.requestReturnedNoBody, { request }));
  }
  return data;
}
