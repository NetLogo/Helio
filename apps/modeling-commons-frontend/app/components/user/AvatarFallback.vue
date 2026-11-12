<template>
  <svg viewBox="0 0 256 256" role="img" :aria-label="label" class="size-full rounded-full">
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="palette[0]" />
        <stop offset="1" :stop-color="palette[1]" />
      </linearGradient>
    </defs>
    <rect width="256" height="256" :fill="`url(#${gradientId})`" />
    <text
      v-if="initials"
      x="128"
      y="128"
      text-anchor="middle"
      dominant-baseline="central"
      fill="#fff"
      font-size="104"
      font-weight="600"
      font-family="inherit"
    >
      {{ initials }}
    </text>
    <g v-else fill="#fff" fill-opacity="0.85">
      <circle cx="128" cy="96" r="50" />
      <ellipse cx="128" cy="240" rx="90" ry="80" />
    </g>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ seed: string; initials?: string; label?: string }>(), {
  initials: "",
  label: "Default avatar",
});

const gradientId = useId();
const palette = computed(() => pickAvatarPalette(props.seed));
</script>
