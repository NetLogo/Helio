<script setup lang="ts">
import { OG_COLORS } from "~/components/OgImage/tokens";

withDefaults(defineProps<{ siteName?: string; size?: number }>(), { siteName: "NetTango", size: 64 });
</script>

<template>
  <div class="flex-row" style="display: flex; flex-direction: row; align-items: center; align-self: flex-start">
    <svg :width="size" :height="size" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <path
        :fill="OG_COLORS.blockRed"
        d="M 256 128 H 896 A 64 64 0 0 1 960 192 V 320 A 128 128 0 0 0 832 448 V 576 A 128 128 0 0 0 960 704 V 832 A 64 64 0 0 1 896 896 H 256 A 64 64 0 0 1 192 832 V 704 A 128 128 0 0 1 64 576 V 448 A 128 128 0 0 1 192 320 V 192 A 64 64 0 0 1 256 128 Z"
      />
      <path
        fill="#FFFFFF"
        d="M 384 371.78 A 32 32 0 0 1 430.31 343.16 L 710.76 483.38 A 32 32 0 0 1 710.76 540.62 L 430.31 680.84 A 32 32 0 0 1 384 652.22 Z"
      />
    </svg>
    <div :style="{ display: 'flex', marginLeft: '18px', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: OG_COLORS.ink }">
      {{ siteName }}
    </div>
  </div>
</template>
