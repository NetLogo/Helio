<template>
  <div id="versions" class="p-2 lg:p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-highlighted">Version History</h3>
        <p v-if="!pending" class="text-xs text-dimmed mt-1">
          {{ versions.length }} version{{ versions.length !== 1 ? "s" : "" }}. Select two to
          compare.
        </p>
      </div>
      <!-- TODO: Enable compare button once implemented -->
      <UButton
        variant="soft"
        size="sm"
        :disabled="!canCompare"
        color="neutral"
        title="Version comparison is coming soon!"
        data-show-from="lg"
        @click="showComingSoonToast('Version comparison')"
      >
        Compare Selected
      </UButton>
    </div>

    <div v-if="pending" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="h-12 rounded-lg border border-default bg-muted animate-pulse"
      />
    </div>

    <div v-else-if="versions.length === 0" class="text-sm text-dimmed py-6 text-center">
      No versions available.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="version in versions"
        :key="version.versionNumber"
        class="flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors"
        :class="
          isSelected(version.versionNumber)
            ? 'border-primary-300 bg-primary-50/60'
            : 'border-default hover:border-accented bg-background'
        "
      >
        <input
          type="checkbox"
          :checked="isSelected(version.versionNumber)"
          class="accent-neutral-darkest bg-neutral-lightest size-4 shrink-0 cursor-pointer"
          @change="toggle(version.versionNumber)"
        />

        <NuxtLink
          :to="`/models/${modelId}/versions/${version.versionNumber}`"
          class="flex items-center gap-2 min-w-0 flex-1"
        >
          <span class="text-sm font-semibold text-highlighted hover:underline">
            V{{ version.versionNumber }}
          </span>
          <span class="text-xs text-dimmed">&middot;</span>
          <span class="text-xs text-muted whitespace-nowrap">
            {{ formatRelativeDate(version.createdAt) }}
          </span>
          <template v-if="version.title">
            <span class="text-xs text-dimmed">&middot;</span>
            <span class="text-xs text-toned truncate">{{ version.title }}</span>
          </template>
        </NuxtLink>

        <p v-if="version.description" class="hidden sm:block text-xs text-muted truncate max-w-xs">
          {{ version.description }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelVersion } from "~/composables/model/useModelVersions";
import { formatRelativeDate } from "~/utils/formatters";

defineProps<{
  modelId: string;
  versions: ModelVersion[];
  pending?: boolean;
}>();

defineEmits<{
  compare: [first: number | null, second: number | null];
}>();

const selected = ref<number[]>([]);

function isSelected(versionNumber: number) {
  return selected.value.includes(versionNumber);
}

function toggle(versionNumber: number) {
  const idx = selected.value.indexOf(versionNumber);
  if (idx !== -1) {
    selected.value.splice(idx, 1);
  } else if (selected.value.length < 2) {
    selected.value.push(versionNumber);
  } else {
    selected.value.shift();
    selected.value.push(versionNumber);
  }
}

const canCompare = computed(() => selected.value.length === 2);
</script>
