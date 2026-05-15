<template>
  <NuxtLink
    v-if="href"
    :to="href"
    class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis hover:opacity-80 transition-opacity"
    :class="getTagColorClass(name)"
  >
    {{ label }}
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis"
    :class="getTagColorClass(name)"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatTagName } from "~/forms/tags";
import { createTagPath, getTagColorClass } from "~/utils/formatters";

const props = withDefaults(
  defineProps<{
    id?: string;
    name: string;
    displayName?: string;
    linkable?: boolean;
  }>(),
  { linkable: true, displayName: "", id: undefined },
);

const label = computed(() => formatTagName({ name: props.name, displayName: props.displayName }));

const href = computed(() => (props.linkable && props.name ? createTagPath(props.name) : null));
</script>
