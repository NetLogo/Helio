import type { AsyncDataOptions } from "#app/composables/asyncData";

export type PaginatedResponse<T> = {
  data: Array<T>;
  page: number;
  count: number;
  limit: number;
};

export default function useApiPagination<T>(
  key: MaybeRefOrGetter<string>,
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  asyncDataOptions: Partial<AsyncDataOptions<PaginatedResponse<T>>> = {},
  initialPage = 0,
) {
  // SSR
  const page = useState(`${toValue(key)}-pagination-page`, () => initialPage);
  const {
    data: fetchedPage,
    error,
    pending,
    refresh,
    clear,
  } = useAsyncData(
    () => `${toValue(key)}-page-${page.value}`,
    () => fetchPage(page.value),
    {
      watch: [page, () => toValue(key)],
      ...asyncDataOptions,
    },
  );
  const ssrData = computed(() => fetchedPage.value?.data ?? []);
  const ssrCount = computed(() => fetchedPage.value?.count);
  const ssrLimit = computed(() => fetchedPage.value?.limit);

  // SSR <-> CSR handoff
  const pages = ref<Record<number, Array<T>>>({});
  const count = ref<number>();
  const limit = ref<number>();
  const initialized = ref(false);
  watch(
    fetchedPage,
    (next) => {
      if (!next) return;
      pages.value = { ...pages.value, [next.page]: next.data };
      if (!initialized.value) {
        count.value = next.count;
        limit.value = next.limit;
        initialized.value = true;
      }
    },
    { immediate: true },
  );

  // CSR
  watch(
    () => toValue(key),
    () => {
      reset();
    },
  );

  // Render data
  const data = computed(() => {
    const result: Array<T> = [];
    for (const p of Object.keys(pages.value)
      .map(Number)
      .sort((a, b) => a - b)) {
      result.push(...pages.value[p]!);
    }
    return result;
  });

  const numberOfPages = computed(() =>
    count.value !== undefined && limit.value !== undefined
      ? Math.ceil(count.value / limit.value)
      : undefined,
  );

  function reset() {
    pages.value = {};
    clear();
    count.value = undefined;
    limit.value = undefined;
    initialized.value = false;
    page.value = initialPage;
    refresh();
  }

  const canLoadMore = computed(
    () =>
      !pending.value &&
      initialized.value &&
      numberOfPages.value !== undefined &&
      page.value < numberOfPages.value - 1,
  );

  function loadNextPage() {
    if (canLoadMore.value) page.value += 1;
  }

  return {
    data: import.meta.server ? ssrData : data,
    page,
    count: import.meta.server ? ssrCount : count,
    limit: import.meta.server ? ssrLimit : limit,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    reset,
    refresh,
  };
}
