<script setup lang="ts">
import { cn } from "@repo/vue-ui/utils";

const props = defineProps<{
  name: string;
  class?: string;
  icon: string;
  description: string;
  background?: string;
  href: string;
  cta: string;
}>();

const className = cn(
  "group relative flex flex-col justify-between overflow-hidden rounded-xl",
  // light styles
  "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
  // dark styles
  "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
  props.class,
);
</script>

<template>
  <div :key="props.name" :class="className">
    <slot name="background">
      <img v-if="background" :src="background" />
    </slot>
    <div />
    <slot name="default">
      <slot name="content">
        <div class="p-4">
          <div
            class="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10"
          >
            <slot name="icon">
              <UIcon
                :name="icon"
                class="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75"
              />
            </slot>

            <slot name="title">
              <h3 class="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
                {{ name }}
              </h3>
            </slot>

            <slot name="description">
              <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ description }}</p>
            </slot>
          </div>

          <div
            :class="
              cn(
                'pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden',
              )
            "
          >
            <UButton
              variant="link"
              trailing-icon="i-lucide-arrow-right"
              :to="href"
              size="xs"
              color="neutral"
              class="pointer-events-auto p-0 w-full"
            >
              {{ cta }}
            </UButton>
          </div>
        </div>
      </slot>

      <div
        class="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
      >
        <UButton
          variant="link"
          :to="href"
          trailing-icon="i-lucide-arrow-right"
          size="xs"
          color="neutral"
          class="pointer-events-auto p-0 w-full"
        >
          {{ cta }}
        </UButton>
      </div>
    </slot>

    <div
      class="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10"
    />
  </div>
</template>
