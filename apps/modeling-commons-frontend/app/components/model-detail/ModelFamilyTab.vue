<template>
  <div class="p-6">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-slate-900">Model Family</h3>
      <p class="text-xs text-slate-400 mt-1">
        Parent and child models that share lineage with this model.
      </p>
    </div>

    <template v-if="parent || children.length > 0">
      <div v-if="parent" class="mb-5">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Forked from</p>
        <FamilyCard :model="parent" />
      </div>

      <div v-if="children.length > 0">
        <button
          class="flex items-center gap-1 text-sm font-semibold text-slate-700 mb-2"
          @click="childrenOpen = !childrenOpen"
        >
          <UIcon :name="childrenOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
          Children ({{ children.length }})
        </button>
        <div v-if="childrenOpen" class="space-y-3">
          <FamilyCard v-for="child in children" :key="child.id" :model="child" />
        </div>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-12 text-slate-400">
      <UIcon name="i-lucide-git-branch" class="size-12 mb-3" />
      <p class="text-sm font-medium">No family connections</p>
      <p class="text-xs mt-1">Parent and child models will appear here.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FamilyModel } from "./types";

defineProps<{
  parent: FamilyModel | null;
  children: FamilyModel[];
}>();

const childrenOpen = ref(true);
</script>
