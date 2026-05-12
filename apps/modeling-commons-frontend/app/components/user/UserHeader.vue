<template>
  <section class="flex gap-6 items-center">
    <UserAvatar :src="image" :name="name" class="size-25 sm:size-30 lg:size-35" variant="compact" />
    <div class="space-y-2">
      <h4 class="mb-0">
        {{ name }}
      </h4>
      <Country v-if="country" :query="country" class="text-xs text-muted align-middle" />
      <p class="text-sm text-muted font-medium flex flex-wrap gap-1 lg:gap-3">
        <span v-if="createdAt">Joined {{ formatRelativeDate(createdAt) }}</span>
        <Middot v-if="createdAt && affiliation" />
        <span v-if="affiliation">{{ affiliation }}</span>
      </p>
      <div v-if="socialLinks" class="flex gap-6">
        <SocialLink
          v-for="(link, index) in socialLinks"
          :key="index"
          v-bind="link"
          variant="compact"
          class="text-2xl"
        />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { SocialMediaLink } from "~/components/shared/SocialLink.vue";

withDefaults(
  defineProps<{
    name?: string;
    image?: string | null;
    country?: string | null;
    affiliation?: string | null;
    createdAt?: string | null;
    socialLinks?: Array<SocialMediaLink>;
  }>(),
  {
    name: "Unknown User",
    image: null,
    country: null,
    affiliation: null,
    createdAt: null,
    socialLinks: () => [],
  },
);
</script>
