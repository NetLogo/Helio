import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  defineComponent,
  h,
  onServerPrefetch,
  reactive,
  ref,
  toValue,
  watch,
  type Ref,
} from "vue";
import { renderToString } from "vue/server-renderer";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const apiComment = {
  id: "c-1",
  modelId: "m-1",
  author: { id: "user-ada", name: "Ada Lovelace", image: "" },
  content: "Server rendered",
  createdAt: "2026-10-01T12:00:00.000Z",
  likes: 3,
};

function useAsyncDataOnServer<T>(_key: () => string, handler: () => Promise<T>) {
  const data: Ref<T | null> = ref(null);
  const status = ref("pending");
  const state = { data, status, error: ref(null), refresh: vi.fn() };
  const promise = handler().then((value) => {
    data.value = value;
    status.value = "success";
  });
  onServerPrefetch(() => promise);
  return Object.assign(
    promise.then(() => state),
    state,
  );
}

function stubAutoImports() {
  const api = makeApiClientMock();
  api.GET.mockResolvedValue(apiResult.ok({ count: 1, limit: 20, page: 0, data: [apiComment] }));
  Object.entries({ computed, reactive, ref, toValue, watch, onServerPrefetch }).forEach(
    ([name, value]) => vi.stubGlobal(name, value),
  );
  vi.stubGlobal("useAsyncData", useAsyncDataOnServer);
  vi.stubGlobal("useApi", () => api.client);
  vi.stubGlobal("useToast", () => ({ add: vi.fn() }));
  vi.stubGlobal("useCommentMutations", () => ({}));
}

beforeEach(() => {
  vi.resetModules();
  stubAutoImports();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCommentThread on the server", () => {
  it("renders the comments the server fetched, not the empty state", async () => {
    const { default: useCommentThread } = await import("~/composables/comments/useCommentThread");
    const Thread = defineComponent({
      setup() {
        const { comments } = useCommentThread({ source: () => ({ modelId: "m-1" }) });
        return () =>
          h(
            "ul",
            comments.value.map((comment) => h("li", comment.content)),
          );
      },
    });

    const html = await renderToString(h(Thread));

    expect(html).toBe("<ul><li>Server rendered</li></ul>");
  });
});
