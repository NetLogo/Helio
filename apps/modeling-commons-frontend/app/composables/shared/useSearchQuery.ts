import { refDebounced } from "@vueuse/core";

export default function useSearchQuery(options: SearchQueryOptions = {}) {
  const {
    debounce: { ms = 300, maxWait = 10000 } = {},
    defaultValue = "",
    transform = (q) => q,
  } = options;

  const rawQuery = ref<string | undefined>(transform(defaultValue));
  const debouncedQuery = refDebounced(rawQuery, ms, { maxWait });

  const query = computed({
    get: () => rawQuery.value,
    set: (val: string) => {
      rawQuery.value = transform(val);
    },
  });

  return { query, debouncedQuery };
}

export type SearchQueryOptions = {
  defaultValue?: string;
  debounce?: {
    ms?: number;
    maxWait?: number;
  };
  transform?: (query: string) => string | undefined;
};
