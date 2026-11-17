<template>
  <slot v-if="showLoading" name="loading"><Loading v-bind="$attrs" /></slot>
  <template v-else-if="pending" />
  <slot v-else-if="error" name="error" :error="error">
    <Error
      icon="lucide:alert-triangle"
      title="Something went wrong"
      :message="error instanceof Error ? error.message : 'An unexpected error occurred.'"
      v-bind="$attrs"
    />
  </slot>
  <slot v-else-if="empty" name="empty">
    <Empty icon="lucide:square-dashed" title="Nothing to see here." v-bind="$attrs" />
  </slot>
  <slot v-else />
</template>

<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";

defineOptions({
  inheritAttrs: false,
});
const props = withDefaults(
  defineProps<{
    pending?: boolean;
    error?: unknown;
    empty?: boolean;
    loadingDelay?: number;
  }>(),
  { loadingDelay: 200 },
);

/*
 * Fetches that settle within the delay never paint the loading slot, which
 * otherwise flickers for a few frames on fast connections and cached data.
 * The server has no timers and hydration must match its markup, so both
 * paint it right away.
 */
const paintsImmediately = import.meta.server || useNuxtApp().isHydrating;
const settledPending = ref(paintsImmediately && props.pending);
watchDebounced(
  () => props.pending,
  (isPending) => (settledPending.value = isPending),
  { debounce: () => props.loadingDelay, immediate: !paintsImmediately },
);
const showLoading = computed(() => props.pending && settledPending.value);
</script>
