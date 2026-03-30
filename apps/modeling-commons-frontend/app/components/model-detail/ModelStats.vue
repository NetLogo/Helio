<template>
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div class="flex items-center gap-6 text-sm text-slate-600">
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-thumbs-up" class="size-4" />
        <span class="font-medium">{{ likes }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-download" class="size-4" />
        <span class="font-medium">{{ downloads }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-eye" class="size-4" />
        <span class="font-medium">{{ views.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-play" class="size-4" />
        <span class="font-medium">{{ runs }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UButton variant="outline" icon="i-lucide-thumbs-up" @click="$emit('like')">
        Like
      </UButton>
      <UButton variant="ghost" icon="i-lucide-share-2" square @click="$emit('share')" />
      <UButton variant="ghost" icon="i-lucide-copy" square @click="$emit('compare')" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  likes: number;
  downloads: number;
  views: number;
  runs: number;
}>();

defineEmits<{
  like: [];
  share: [];
  compare: [];
}>();
</script>
