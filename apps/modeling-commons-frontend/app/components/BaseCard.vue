<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" :class="[to ? 'group block' : 'block']">
    <UCard
      :ui="{
        root: 'transition-all duration-300 relative rounded-xl ring-1 ring-default border-0 divide-y-0 bg-background',
        header: 'p-0 sm:p-0',
        body: 'p-4 sm:p-4',
      }"
      :class="{
        'hover:ring-primary-300 hover:shadow-lg hover:shadow-primary-100/50 hover:-translate-y-0.5':
          to,
      }"
    >
      <template #header>
        <slot name="cover">
          <div
            class="h-40 bg-gradient-to-br from-primary-50/60 via-elevated to-primary-100/40 relative overflow-hidden"
          >
            <div class="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="card-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="0.5"
                      class="text-primary-400"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card-grid)" />
              </svg>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
              <slot name="icon">
                <UIcon
                  name="i-lucide-box"
                  class="size-12 text-primary-300 transition-colors"
                  :class="{ 'group-hover:text-primary-400': to }"
                />
              </slot>
            </div>
          </div>
        </slot>
      </template>

      <div class="space-y-2">
        <slot name="body">
          <div class="flex justify-between items-center">
            <h4
              v-if="title"
              class="text-md font-semibold text-highlighted leading-tight transition-colors"
              :class="{ 'group-hover:text-primary-700': to }"
            >
              {{ title }}
            </h4>
            <div class="flex gap-1.5">
              <slot name="badges" />
            </div>
          </div>

          <p class="text-sm text-muted line-clamp-3 h-[3lh] leading-relaxed">
            {{ description ?? "No description provided." }}
          </p>

          <slot />
        </slot>

        <div v-if="hasFooter" class="flex items-center justify-between pt-1">
          <slot name="footer" />
        </div>
      </div>
    </UCard>
  </component>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";
import { computed, useSlots } from "vue";

defineProps<{
  to?: string;
  title?: string;
  description?: string | null;
}>();

const slots = useSlots();
const hasFooter = computed(() => !!slots.footer);
</script>
