<script setup lang="ts">
import { useSiteConfig } from "#site-config/app/composables";
import { computed } from "vue";
import { OG_COLORS } from "./tokens";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: "Let your students build the science.",
    description: undefined,
  },
);

const site = useSiteConfig();
const resolvedSiteName = computed(() => site.name ?? "NetTango");
const host = computed(() => new URL(site.url).host);
const titleSize = computed(() => (props.title.length > 40 ? 60 : 80));
</script>

<template>
  <div
    class="flex-col"
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '56px 64px',
      backgroundColor: OG_COLORS.wall,
      color: OG_COLORS.ink,
      fontFamily: 'Nunito',
    }"
  >
    <NtOgBrand :site-name="resolvedSiteName" />
    <div class="flex-col" style="display: flex; flex-direction: column; max-width: 1000px">
      <div
        class="font-bold"
        :style="{
          display: 'flex',
          fontSize: `${titleSize}px`,
          lineHeight: 1.02,
          letterSpacing: '-0.035em',
          lineClamp: 3,
          color: OG_COLORS.ink,
        }"
      >
        {{ title }}
      </div>
      <div
        v-if="description"
        :style="{ display: 'flex', marginTop: '28px', fontSize: '30px', lineHeight: 1.4, lineClamp: 3, color: OG_COLORS.inkToned }"
      >
        {{ description }}
      </div>
    </div>
    <div class="font-bold" :style="{ display: 'flex', fontSize: '26px', color: OG_COLORS.blue }">{{ host }}</div>
  </div>
</template>
