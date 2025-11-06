<!-- eslint-disable vue/no-v-html, vue/no-v-text-v-html-on-component -->
<template>
  <UBanner
    v-for="announcement in bannerAnnouncements"
    :key="announcement.id"
    class="mb-4"
    variant="info"
    dismissible
    v-bind="announcement.attributes"
  >
    <template #title>
      <div v-html="announcement.html" />
    </template>
  </UBanner>
</template>

<script setup lang="ts">
import endpoints from '@/assets/endpoints.json';
import type { Announcements } from '~~/shared/models/announcements';
import { Announcement } from '~~/shared/models/announcements';

const fetcher = async () => {
  try {
    const res = await $fetch<Announcements>(endpoints.announcements);
    return res.map((item) => new Announcement(item));
  } catch {
    return [];
  }
};

const { data: announcements } = await useLazyAsyncData<Announcements>('announcements', fetcher, { server: false });

const route = useRoute();
const productInfo = useProductInfo();
const toast = useToast();

const visibleAnnouncements = computed(() => {
  if (!announcements.value) return [];

  return announcements.value.filter((item) => {
    return item.appliesTo(route.path, productInfo.productVersion);
  });
});

const bannerAnnouncements = computed(() => {
  return visibleAnnouncements.value.filter((item) => item.kind === 'banner');
});

const toastAnnouncements = computed(() => {
  return visibleAnnouncements.value.filter((item) => item.kind === 'toast');
});

watch(
  toastAnnouncements,
  (toasts) => {
    toasts.forEach((announcement) => {
      toast.add({
        ...announcement.attributes,
        onClick: () => {
          toast.remove(announcement.id);
          if (announcement.attributes.href) {
            window.open(announcement.attributes.href as string, '_blank');
          }
        },
      });
    });
  },
  { immediate: true },
);
</script>
