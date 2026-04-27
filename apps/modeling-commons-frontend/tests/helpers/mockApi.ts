import { vi, type Mock } from "vitest";

type Result<T> = { data?: T; error?: unknown; response: Response };

function ok<T>(data: T): Result<T> {
  return {
    data,
    response: new Response(JSON.stringify(data), { status: 200 }),
  };
}

function err(status = 500, message = "error"): Result<never> {
  return {
    error: { message },
    response: new Response(JSON.stringify({ message }), { status }),
  };
}

export function makeApiClientMock() {
  const GET: Mock = vi.fn();
  const POST: Mock = vi.fn();
  const PUT: Mock = vi.fn();
  const PATCH: Mock = vi.fn();
  const DELETE: Mock = vi.fn();
  const client = { GET, POST, PUT, PATCH, DELETE };
  return { client, GET, POST, PUT, PATCH, DELETE };
}

export const apiResult = { ok, err };
export type ApiClientMock = ReturnType<typeof makeApiClientMock>;
