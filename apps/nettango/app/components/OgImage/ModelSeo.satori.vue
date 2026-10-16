<script setup lang="ts">
import { useSiteConfig } from "#site-config/app/composables";
import { computed } from "vue";
import { OG_COLORS } from "./tokens";

const props = withDefaults(
  defineProps<{
    title?: string;
    topic?: string;
    thumbnail?: string;
    note?: string;
  }>(),
  {
    title: "NetTango model",
    topic: undefined,
    thumbnail: undefined,
    note: "Run it in your browser or open it in the NetTango Builder.",
  },
);

const resolvedSiteName = computed(() => useSiteConfig().name ?? "NetTango");
const titleSize = computed(() => (props.title.length > 34 ? 56 : 72));
</script>

<template>
  <div
    class="flex-row"
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      padding: '56px 64px',
      backgroundColor: OG_COLORS.wall,
      color: OG_COLORS.ink,
      fontFamily: 'Inter',
    }"
  >
    <div class="flex-col" style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; align-self: stretch; width: 520px; margin-right: 34px">
      <NtOgBrand :site-name="resolvedSiteName" />
      <div class="flex-col" style="display: flex; flex-direction: column">
        <div
          v-if="topic"
          :style="{
            display: 'flex',
            fontSize: '26px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: OG_COLORS.blue,
            marginBottom: '16px',
          }"
        >
          {{ topic }}
        </div>
        <div
          :style="{
            display: 'flex',
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            lineClamp: 3,
            color: OG_COLORS.ink,
          }"
        >
          {{ title }}
        </div>
      </div>
      <div :style="{ display: 'flex', fontSize: '26px', lineHeight: 1.4, color: OG_COLORS.inkToned }">{{ note }}</div>
    </div>
    <div
      class="flex-row"
      :style="{
        display: 'flex',
        width: '518px',
        height: '518px',
        boxSizing: 'border-box',
        borderRadius: '24px',
        backgroundColor: OG_COLORS.screen,
        border: `3px solid ${OG_COLORS.screenEdge}`,
        overflow: 'hidden',
        flexShrink: 0,
      }"
    >
      <img v-if="thumbnail" :src="thumbnail" width="512" height="512" style="width: 512px; height: 512px; object-fit: cover" />
    </div>
  </div>
</template>
