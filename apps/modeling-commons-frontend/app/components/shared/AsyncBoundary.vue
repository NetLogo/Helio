<template>
  <slot v-if="pending" name="loading" ><Loading v-bind="$attrs" /></slot>
  <slot v-else-if="error" name="error" :error="error">
    <Error
      icon="lucide:alert-triangle"
      title="Something went wrong"
      :message="error instanceof Error ? error.message : 'An unexpected error occurred.'"
      v-bind="$attrs"
    />
  </slot>
  <slot v-else-if="empty" name="empty">
    <Empty
      icon="lucide:square-dashed"
      title="Nothing to see here."
      v-bind="$attrs"
    />
  </slot>
  <slot v-else />
</template>

<script lang="ts" setup>
defineOptions({
  inheritAttrs: false,
});
defineProps<{
  pending?: boolean;
  error?: unknown;
  empty?: boolean;
}>();
</script>