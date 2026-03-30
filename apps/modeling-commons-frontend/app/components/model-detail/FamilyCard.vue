<template>
  <NuxtLink
    :to="`/models/${model.id}`"
    class="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 transition-colors"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-blue-700">{{ model.title }}</span>
          <UBadge v-if="model.linkedVersionNumber !== null" variant="subtle" color="info" size="xs">
            V{{ model.linkedVersionNumber }}
          </UBadge>
          <UBadge v-if="model.isEndorsed" variant="subtle" color="success" size="xs">Endorsed</UBadge>
          <UBadge variant="subtle" color="neutral" size="xs">{{ model.visibility }}</UBadge>
        </div>

        <p v-if="model.description" class="text-xs text-slate-500 mt-1 line-clamp-2">
          {{ model.description }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3 mt-2 text-xs text-slate-400">
      <span v-if="model.authorName" class="flex items-center gap-1">
        <UIcon name="i-lucide-user" class="size-3" />
        {{ model.authorName }}
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-layers" class="size-3" />
        {{ model.versionCount }} version{{ model.versionCount !== 1 ? "s" : "" }}
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-calendar" class="size-3" />
        {{ formatRelativeDate(model.createdAt) }}
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { formatRelativeDate } from "~/utils/formatters";
import type { FamilyModel } from "./types";

defineProps<{
  model: FamilyModel;
}>();
</script>
