<template>
  <UCard
    :variant="variant"
    :ui="{
      root: 'rounded-xl border-0 ring-1 ring-neutral-darkest/8 bg-background',
      body: 'p-6 sm:p-8',
    }"
  >
    <section class="grid gap-6">
      <header v-if="title || description || eyebrow || $slots.header" class="grid gap-3">
        <div class="grid gap-3">
          <p v-if="eyebrow" class="m-0 text-xs uppercase tracking-widest text-muted">
            {{ eyebrow }}
          </p>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="grid gap-1.5">
              <h2 v-if="title" class="m-0 text-xl font-medium text-highlighted">{{ title }}</h2>
              <p v-if="description" class="m-0 text-sm text-muted">{{ description }}</p>
            </div>
            <slot name="header" />
          </div>
        </div>
      </header>
      <div class="grid gap-5">
        <slot />
      </div>
    </section>
  </UCard>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    variant?: "outline" | "soft" | "subtle" | "solid";
  }>(),
  {
    eyebrow: undefined,
    title: undefined,
    description: undefined,
    variant: "outline",
  },
);
</script>
