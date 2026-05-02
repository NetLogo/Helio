<template>
  <UCard
    :variant="variant"
    :ui="{
      root: 'ring-0',
      body: 'p-1 sm:p-1',
    }"
  >
    <section :id="id" class="grid gap-6">
      <header v-if="title || description || $slots.header" class="grid gap-3">
        <div class="grid gap-3">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="grid gap-1.5">
              <h6 v-if="title" class="m-0 font-medium text-highlighted">
                <a :href="'#' + id">{{ title }}</a>
              </h6>
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
import slugify from "slugify";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    variant?: "outline" | "soft" | "subtle" | "solid";
  }>(),
  {
    title: undefined,
    description: undefined,
    variant: "outline",
  },
);

const id = computed(() => slugify(props.title ?? "", { lower: true, strict: true }));
</script>
