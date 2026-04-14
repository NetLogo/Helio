<template>
  <section class="flex items-center justify-between flex-wrap gap-4">
    <div class="flex items-center gap-3 text-sm text-toned">
      <div class="flex items-center gap-1.5 px-2.5">
        <UIcon name="i-lucide-thumbs-up" class="size-4" />
        <span class="font-medium">{{ likes }}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5">
        <UIcon name="i-lucide-download" class="size-4" />
        <span class="font-medium">{{ downloads }}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5">
        <UIcon name="i-lucide-eye" class="size-4" />
        <span class="font-medium">{{ views.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5">
        <UIcon name="i-lucide-play" class="size-4" />
        <span class="font-medium">{{ runs }}</span>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UButton variant="outline" size="sm" icon="i-lucide-thumbs-up" @click="$emit('like')">
        Like
      </UButton>
      <UButton variant="outline" size="sm" icon="i-lucide-share-2" square @click="$emit('share')" />
      <UButton variant="outline" size="sm" icon="i-lucide-copy" square @click="$emit('compare')" />
    </div>
  </section>
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
