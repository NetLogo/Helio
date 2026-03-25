<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-highlighted">Version History</h3>
        <p class="text-xs text-dimmed mt-1">
          {{ versions.length }} version{{ versions.length !== 1 ? "s" : "" }}.
          Select two to compare.
        </p>
      </div>
      <UButton
        variant="soft"
        :disabled="!canCompare"
        @click="$emit('compare', selected[0] ?? null, selected[1] ?? null)"
      >
        Compare Selected
      </UButton>
    </div>

    <div class="space-y-3">
      <div
        v-for="version in versions"
        :key="version.versionNumber"
        class="flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors cursor-pointer"
        :class="isSelected(version.versionNumber)
          ? 'border-primary-300 bg-primary-50/60'
          : 'border-default hover:border-accented bg-background'"
        @click="toggle(version.versionNumber)"
      >
        <input
          type="checkbox"
          :checked="isSelected(version.versionNumber)"
          class="accent-primary-600 size-4 shrink-0 pointer-events-none"
          tabindex="-1"
        />

        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="text-sm font-semibold text-highlighted">V{{ version.versionNumber }}</span>
          <span class="text-xs text-dimmed">&middot;</span>
          <span class="text-xs text-muted whitespace-nowrap">{{ formatRelativeDate(version.createdAt) }}</span>
          <span class="text-xs text-dimmed">&middot;</span>
          <NuxtLink class="text-xs text-primary-700 hover:underline shrink-0">
            {{ version.uploaderName ?? "Unknown" }}
          </NuxtLink>
        </div>

        <p v-if="version.description" class="hidden sm:block text-xs text-muted truncate max-w-xs">
          {{ version.description }}
        </p>

        <UButton
          variant="ghost"
          icon="i-lucide-download"
          size="xs"
          square
          @click.stop="$emit('download', version.nlogoxFileId)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatRelativeDate } from "~/utils/formatters";
import type { VersionRow } from "./types";

defineProps<{
  versions: VersionRow[];
}>();

defineEmits<{
  compare: [first: number | null, second: number | null];
  download: [fileId: string];
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
