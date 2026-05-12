<template>
  <div class="flex items-center gap-3 text-sm text-toned">
    <StatView v-if="likes !== undefined" icon="i-lucide-thumbs-up" :count="likes" />
    <StatView icon="i-lucide-download" :count="downloads" />
    <StatView icon="i-lucide-eye" :count="views" />
    <StatView icon="i-lucide-play" :count="runs" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  likes?: number;
  downloads: number;
  views: number;
  runs: number;
}>();
</script>
