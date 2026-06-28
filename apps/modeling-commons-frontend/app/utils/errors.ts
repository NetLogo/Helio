import type { NuxtError } from "#app";

export function createApiError(error: ApiError, when?: string, whatNow?: string): NuxtError {
  const whenString = when ? `while ${when}` : "";
  const whatNowString = whatNow ? ` Please ${whatNow}.` : "";
  const correlationString = error.correlationId ? `(correlation ID: ${error.correlationId})` : "";
  return createError({
    statusCode: error.statusCode ?? 500,
    message: [
      [error.message, whenString, correlationString].filter(Boolean).join(" ") + ".",
      whatNowString,
    ]
      .filter(Boolean)
      .join(" "),
    data: { ...error },
  });
}

export function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { statusCode?: number; status?: number; response?: { status?: number } };
  return e.statusCode ?? e.status ?? e.response?.status;
}

export function isAccessDeniedError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
}

export function handleApiError<T>(
  data: NonNullable<T> | undefined | null,
  error: ApiError | undefined,
  when: string | undefined = undefined,
  whatNow:
    | string
    | undefined = "try again later or reach out via email, GitHub, or the NetLogo Forum if the problem persists",
): T {
  if (error) {
    throw createApiError(error, when, whatNow);
  } else {
    return data as T;
  }
}
