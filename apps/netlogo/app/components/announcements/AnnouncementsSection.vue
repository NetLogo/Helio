<template>
  <div class="container py-5 text-start">
    <h1 class="text-3xl lg:text-4xl font-bold mb-6">Announcements</h1>

    <p v-if="announcementData.length === 0" class="text-gray-600">No announcements available.</p>

    <div v-else class="space-y-8">
      <div
        v-for="announcement in announcementData"
        :key="announcement.id"
        class="border-b border-gray-200 pb-6"
      >
        <h2 class="text-3xl font-semibold text-gray-800">{{ announcement.title }}</h2>
        <p class="text-lg text-gray-500 mb-2">
          {{ formatDate(announcement.date) }}
        </p>
        <div>
          <MDC :value="announcement.content" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnnouncementEntry } from "~/utils/api";

defineProps<{
  announcementData: AnnouncementEntry[];
}>();

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};
</script>
