<template>
  <figure class="relative">
    <template v-if="hung">
      <div
        aria-hidden="true"
        class="absolute -top-cable left-[12%] hidden h-cable w-px bg-ink-cable lg:block"
      />
      <div
        aria-hidden="true"
        class="absolute -top-cable right-[12%] hidden h-cable w-px bg-ink-cable lg:block"
      />
      <div
        aria-hidden="true"
        class="relative z-10 -mx-4 h-roller rounded-full bg-linear-to-b/srgb from-screen-roller to-screen-roller-dark shadow-roller"
      />
    </template>

    <div
      class="nt-screen-glow relative px-5 pt-6 pb-4 shadow-screen sm:px-7"
      :class="{ '-mt-1.5': hung }"
    >
      <slot />
    </div>

    <div aria-hidden="true" class="relative -mx-1 h-screen-bar rounded-b-screen bg-screen-bar" />
    <template v-if="hung">
      <div aria-hidden="true" class="mx-auto h-5 w-px bg-slate-900/40" />
      <div aria-hidden="true" class="mx-auto -mt-px h-3 w-7 rounded-full border-2 border-slate-900/40" />
    </template>

    <slot name="overlay" />

    <figcaption v-if="$slots.caption" class="mt-5 text-center text-sm text-toned lg:mt-3 lg:text-right">
      <slot name="caption" />
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ hung?: boolean }>(), { hung: false });
</script>

<style scoped>
.nt-screen-glow {
  background: radial-gradient(
    120% 90% at 50% 38%,
    var(--color-screen-glow) 0%,
    var(--color-screen-glow-mid) 55%,
    var(--color-screen-glow-edge) 100%
  );
}
</style>
