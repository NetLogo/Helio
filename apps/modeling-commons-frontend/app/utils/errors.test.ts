import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiError, getErrorStatus, handleApiError, isAccessDeniedError } from "./errors";

type CreateErrorInput = { statusCode?: number; message?: string; data?: unknown };

const globalWithCreateError = globalThis as unknown as {
  createError?: (input: CreateErrorInput) => Error & CreateErrorInput;
};

const originalCreateError = globalWithCreateError.createError;

beforeAll(() => {
  globalWithCreateError.createError = (input: CreateErrorInput) => {
    const err = new Error(input.message) as Error & CreateErrorInput;
    err.statusCode = input.statusCode;
    err.message = input.message ?? "";
    err.data = input.data;
    return err;
  };
});

afterAll(() => {
  globalWithCreateError.createError = originalCreateError;
});

describe("createApiError", () => {
  it("uses the provided statusCode", () => {
    const err = createApiError({ statusCode: 418, message: "I'm a teapot" } as never);
    expect(err.statusCode).toBe(418);
  });

  it("defaults statusCode to 500 when missing", () => {
    const err = createApiError({ message: "boom" } as never);
    expect(err.statusCode).toBe(500);
  });

  it("includes the original message", () => {
    const err = createApiError({ statusCode: 400, message: "Bad input" } as never);
    expect(err.message).toContain("Bad input");
  });

  it("includes the 'when' context and correlation id when present", () => {
    const err = createApiError(
      { statusCode: 500, message: "Server error", correlationId: "abc-123" } as never,
      "fetching model",
    );
    expect(err.message).toContain("while fetching model");
    expect(err.message).toContain("abc-123");
  });

  it("appends the whatNow guidance when provided", () => {
    const err = createApiError(
      { statusCode: 500, message: "Server error" } as never,
      undefined,
      "try again later",
    );
    expect(err.message).toContain("Please try again later.");
  });

  it("attaches the error payload as data", () => {
    const payload = { statusCode: 403, message: "Forbidden", correlationId: "xyz" };
    const err = createApiError(payload as never);
    expect(err.data).toMatchObject(payload);
  });
});

describe("getErrorStatus", () => {
  it("reads statusCode from a wrapped Nuxt error", () => {
    expect(getErrorStatus({ statusCode: 403 })).toBe(403);
  });

  it("falls back to status", () => {
    expect(getErrorStatus({ status: 404 })).toBe(404);
  });

  it("falls back to a nested response status", () => {
    expect(getErrorStatus({ response: { status: 401 } })).toBe(401);
  });

  it("returns undefined for non-object errors", () => {
    expect(getErrorStatus(null)).toBeUndefined();
    expect(getErrorStatus("nope")).toBeUndefined();
  });
});

describe("isAccessDeniedError", () => {
  it("is true for 401 and 403", () => {
    expect(isAccessDeniedError({ statusCode: 401 })).toBe(true);
    expect(isAccessDeniedError({ statusCode: 403 })).toBe(true);
  });

  it("is false for other statuses", () => {
    expect(isAccessDeniedError({ statusCode: 404 })).toBe(false);
    expect(isAccessDeniedError({ statusCode: 500 })).toBe(false);
    expect(isAccessDeniedError(null)).toBe(false);
  });
});

describe("handleApiError", () => {
  it("returns the data when no error is present", () => {
    expect(handleApiError({ id: 1 }, undefined)).toEqual({ id: 1 });
  });

  it("throws the created error when an error is present", () => {
    expect(() =>
      handleApiError(undefined, { statusCode: 404, message: "Not found" } as never),
    ).toThrow(/Not found/);
  });

  it("returns null/undefined data unchanged when no error", () => {
    expect(handleApiError(null, undefined)).toBeNull();
  });
});
