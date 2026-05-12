<template>
  <USelectMenu
    v-model="selected"
    v-model:search-term="searchTerm"
    placeholder="NetLogo Version"
    :items="items"
    icon="i-lucide-box"
    :loading="loading"
  >
    <template #empty>
      <UEmpty
        icon="i-lucide-box"
        title="No versions found"
        description="Try adjusting your search."
        variant="naked"
      />
    </template>
  </USelectMenu>
</template>

<script lang="ts">
export type NetLogoVersionItem = { label: string; value: string };
export const toNetLogoVersionItem = (version: string): NetLogoVersionItem => ({
  label: version,
  value: version,
});
</script>

<script setup lang="ts">
const props = defineProps<{
  versions: Array<string>;
  loading: boolean;
}>();

const items = computed<NetLogoVersionItem[]>(() => props.versions.map(toNetLogoVersionItem));

const selected = defineModel<NetLogoVersionItem | undefined>({
  type: Object as () => NetLogoVersionItem | undefined,
  default: undefined,
});
const searchTerm = defineModel<string>("search-term", { type: String, default: "" });
</script>
