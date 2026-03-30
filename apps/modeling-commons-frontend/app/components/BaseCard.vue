<!-- app/components/UiCard.vue -->
<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" :class="[to ? 'group block' : 'block']">
    <UCard
      :ui="{
        root: 'transition-all duration-300 relative rounded-xl ring-1 ring-slate-200 border-0 divide-y-0',
        header: 'p-0 sm:p-0',
        body: 'p-4 sm:p-4'
      }"
      :class="{ 'hover:ring-blue-300 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5': to }"
    >
      <template #header>
        <slot name="cover">
          <div class="h-40 bg-gradient-to-br from-red-50 via-slate-50 to-blue-50 relative overflow-hidden">
            <div class="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="card-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-width="0.5" class="text-blue-400" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#card-grid)" />
              </svg>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
              <slot name="icon">
                <UIcon name="i-lucide-box" class="size-12 text-blue-300 transition-colors" :class="{ 'group-hover:text-blue-400': to }" />
              </slot>
            </div>

            <div class="absolute top-3 right-3 flex gap-1.5">
              <slot name="badges" />
            </div>
          </div>
        </slot>
      </template>

      <div class="space-y-2">
        <slot name="body">
          <h3 v-if="title" class="font-semibold text-slate-900 truncate text-[0.95rem] leading-tight transition-colors" :class="{ 'group-hover:text-blue-700': to }">
            {{ title }}
          </h3>

          <p v-if="description" class="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {{ description }}
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
import { useSlots, computed } from 'vue';
import { NuxtLink } from '#components';

defineProps<{
  to?: string;
  title?: string;
  description?: string | null;
}>();

const slots = useSlots();
const hasFooter = computed(() => !!slots.footer);
</script>
