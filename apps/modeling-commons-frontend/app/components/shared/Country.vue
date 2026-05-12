<template>
  <span class="inline-flex items-center" v-bind="$attrs">
    <UIcon :name="icon" />
    <span
      v-if="country && props.variant === 'default'"
      class="ml-1 text-sm text-muted align-middle"
      >{{ country.label }}</span
    >
  </span>
</template>

<script lang="ts" setup>
import countries from "~/data/countries";

const props = withDefaults(
  defineProps<{
    query: string;
    flagVariant?: "1x1" | "4x3";
    variant?: "default" | "compact";
  }>(),
  {
    variant: "default",
    flagVariant: "4x3",
  },
);

const country = computed(() => {
  return countries.find((c) =>
    [c.value, c.label, c.icon].some((field) => field?.toLowerCase() === props.query.toLowerCase()),
  );
});

const icon = computed(
  () => country.value?.icon ?? `flag:${country.value?.value.toLowerCase()}-${props.flagVariant}`,
);
</script>
