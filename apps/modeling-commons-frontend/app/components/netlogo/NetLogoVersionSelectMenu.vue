<template>
  <USelectMenu
    ref="selectMenu"
    v-model="selected"
    v-model:search-term="searchTerm"
    placeholder="NetLogo Version"
    :items="items"
    icon="i-lucide-box"
    :loading="loading"
  >
    <template v-if="selected?.value" #content-bottom >
      <div class="px-2 py-1 border-t border-muted fade-in">
        <UButton variant="link" color="error" size="xs" class="w-full" icon="i-lucide-x" @click.stop="clearSelection">
          <span class="text-sm">Clear selected version</span>
      </UButton>
      </div>
    </template>
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
import type { USelectMenu } from '#components';

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

const ref = useTemplateRef("selectMenu");

function clearSelection() {
  selected.value = undefined;
  searchTerm.value = "";
  ref.value?.triggerRef.click();
}
</script>
