import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import useApiPagination, { type PaginatedResponse } from "~/composables/api/useApiPagination";

function pageResponse<T>(
  data: Array<T>,
  page: number,
  count: number,
  limit = 2,
): PaginatedResponse<T> {
  return { data, page, count, limit };
}

beforeEach(async () => {
  await clearNuxtData();
  clearNuxtState();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useApiPagination", () => {
  it("loads the first page and exposes its rows + count/limit", async () => {
    const fetchPage = vi.fn(async (p: number) =>
      pageResponse([`row-${p}-a`, `row-${p}-b`], p, 6, 2),
    );

    const pag = useApiPagination("pag-basic", fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(pag.data.value).toEqual(["row-0-a", "row-0-b"]);
    expect(pag.count.value).toBe(6);
    expect(pag.limit.value).toBe(2);
  });

  it("canLoadMore is true when more pages remain", async () => {
    const fetchPage = vi.fn(async (p: number) => pageResponse([`row-${p}`], p, 4, 1));

    const pag = useApiPagination("pag-canload", fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(pag.canLoadMore.value).toBe(true);
  });

  it("canLoadMore is false once on the last page", async () => {
    const fetchPage = vi.fn(async (p: number) => pageResponse([`row-${p}`], p, 1, 5));

    const pag = useApiPagination("pag-last", fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(pag.canLoadMore.value).toBe(false);
  });

  it("loadNextPage advances the page ref and appends results", async () => {
    const fetchPage = vi.fn(async (p: number) => pageResponse([`row-${p}`], p, 3, 1));

    const pag = useApiPagination("pag-next", fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    pag.loadNextPage();
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(pag.page.value).toBe(1);
    expect(pag.data.value).toEqual(["row-0", "row-1"]);
  });

  it("reset clears data and returns the page to the initial page", async () => {
    const fetchPage = vi.fn(async (p: number) => pageResponse([`row-${p}`], p, 5, 1));

    const pag = useApiPagination("pag-reset", fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    pag.loadNextPage();
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    pag.reset();
    expect(pag.data.value).toEqual([]);
    expect(pag.count.value).toBeUndefined();
    expect(pag.limit.value).toBeUndefined();
    expect(pag.page.value).toBe(0);
  });

  it("re-fetches when the key changes and discards the previous result set", async () => {
    const key = ref("key-a");
    const fetchPage = vi.fn(async (p: number) => pageResponse([`${key.value}-${p}`], p, 4, 2));

    const pag = useApiPagination(() => key.value, fetchPage);
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(pag.data.value).toEqual(["key-a-0"]);

    key.value = "key-b";
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();
    await new Promise<void>((r) => setTimeout(r, 0));
    await nextTick();

    expect(pag.data.value).toEqual(["key-b-0"]);
  });
});
