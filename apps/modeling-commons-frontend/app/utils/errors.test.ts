import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiError, handleApiError } from "./errors";

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
