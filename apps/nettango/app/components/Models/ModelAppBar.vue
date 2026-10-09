<template>
  <header class="flex h-12 shrink-0 items-center gap-2 border-b-2 border-primary bg-default px-3">
    <NuxtLink
      to="/"
      aria-label="NetTango home"
      class="me-1 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
    >
      <BrandLogo class="h-6 w-auto max-md:hidden" />
      <BrandLogo class="size-6 md:hidden" viewBox="0 0 122 122" />
    </NuxtLink>

    <template v-if="model && nav">
      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'start', collisionPadding: 8 }"
        :ui="{ content: 'w-72 max-h-(--reka-dropdown-menu-content-available-height)', item: 'font-normal' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-layout-grid"
          trailing-icon="i-lucide-chevron-down"
          label="Models"
          class="shrink-0"
        />
        <template #current-trailing>
          <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
          <span class="sr-only">(current model)</span>
        </template>
      </UDropdownMenu>

      <USeparator orientation="vertical" class="h-5" />

      <UBreadcrumb :items="trail" class="min-w-0 flex-1 max-sm:hidden" :ui="{ list: 'm-0' }" />
      <p class="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted sm:hidden">{{ model.title }}</p>

      <div v-if="nav.sequence" class="flex shrink-0 items-center max-sm:hidden" role="group" :aria-label="`${nav.sequence.title} sequence`">
        <UTooltip :text="nav.sequence.previous ? `Previous: ${nav.sequence.previous.title}` : 'First step'">
          <UButton
            :to="nav.sequence.previous ? `/models/${nav.sequence.previous.id}` : undefined"
            :disabled="!nav.sequence.previous"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-chevron-left"
            :aria-label="nav.sequence.previous ? `Previous step: ${nav.sequence.previous.title}` : 'No previous step'"
          />
        </UTooltip>
        <span class="px-1 text-xs text-muted tabular-nums max-lg:sr-only">
          Step {{ nav.sequence.step }} of {{ nav.sequence.total }}
        </span>
        <UTooltip :text="nav.sequence.next ? `Next: ${nav.sequence.next.title}` : 'Last step'">
          <UButton
            :to="nav.sequence.next ? `/models/${nav.sequence.next.id}` : undefined"
            :disabled="!nav.sequence.next"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-chevron-right"
            :aria-label="nav.sequence.next ? `Next step: ${nav.sequence.next.title}` : 'No next step'"
          />
        </UTooltip>
      </div>

      <div class="flex shrink-0 items-center gap-1 max-sm:hidden">
        <USeparator orientation="vertical" class="mx-1 h-5" />
        <UButton
          :to="TUTORIAL_PATH"
          color="neutral"
          variant="ghost"
          icon="i-lucide-graduation-cap"
          label="Tutorial"
          :ui="{ label: 'max-lg:sr-only' }"
        />
        <USeparator orientation="vertical" class="mx-1 h-5" />
        <UTooltip :text="sidebarLabel">
          <UButton
            color="neutral"
            variant="ghost"
            square
            :aria-label="sidebarLabel"
            :aria-pressed="sidebarVisible"
            @click="emit('toggleSidebar')"
          >
            <UIcon :name="sidebarIcons.desktop" class="size-5 max-lg:hidden" />
            <UIcon :name="sidebarIcons.compact" class="size-5 lg:hidden" />
          </UButton>
        </UTooltip>
        <UTooltip text="Swap sides">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left-right"
            aria-label="Swap sides"
            :aria-pressed="swapped"
            :ui="{ leadingIcon: 'max-lg:rotate-90' }"
            @click="emit('swap')"
          />
        </UTooltip>
        <UTooltip text="Reset split">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-columns-2"
            aria-label="Reset split"
            class="max-lg:hidden"
            @click="emit('resetSplit')"
          />
        </UTooltip>
      </div>

      <UDropdownMenu :items="overflowItems" :content="{ align: 'end' }" :ui="{ item: 'font-normal' }" class="sm:hidden">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-ellipsis-vertical"
          aria-label="More"
          class="ms-auto shrink-0 sm:hidden"
        />
      </UDropdownMenu>
    </template>
  </header>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import BrandLogo from "@repo/vue-ui/assets/brands/NetTango-Logo.svg";
import type { GalleryModel } from "~/composables/useModels";

const TUTORIAL_PATH = "/tutorials/introduction-to-the-nettango-builder";

const props = defineProps<{
  model?: GalleryModel;
  sidebarVisible: boolean;
  sidebarIcons: { desktop: string; compact: string };
  swapped: boolean;
}>();

const emit = defineEmits<{ toggleSidebar: []; swap: []; resetSplit: [] }>();

const curation = useModelCuration();
const models = useModels();
const nav = computed(() => props.model && modelNavigation(curation, models, props.model.id));

const sidebarLabel = computed(() => (props.sidebarVisible ? "Hide details" : "Show details"));

const menuItems = computed<DropdownMenuItem[][]>(() => [
  ...(nav.value?.groups ?? []).map((group) => [
    { type: "label" as const, label: group.title },
    ...group.models.map((model) => ({
      label: model.title,
      to: `/models/${model.id}`,
      slot: model.current ? "current" : undefined,
    })),
  ]),
  [{ label: "All models", icon: "i-lucide-images", to: "/models-gallery" }],
]);

const trail = computed(() => [
  ...(nav.value?.topic
    ? [{ label: nav.value.topic.title, to: `/models-gallery#group-${nav.value.topic.id}` }]
    : []),
  { label: props.model?.title ?? "" },
]);

const overflowItems = computed<DropdownMenuItem[][]>(() => {
  const sequence = nav.value?.sequence;
  const steps: DropdownMenuItem[] = sequence
    ? [
        { type: "label", label: `Step ${sequence.step} of ${sequence.total} in ${sequence.title}` },
        ...(sequence.previous
          ? [{ label: sequence.previous.title, description: "Previous step", icon: "i-lucide-chevron-left", to: `/models/${sequence.previous.id}` }]
          : []),
        ...(sequence.next
          ? [{ label: sequence.next.title, description: "Next step", icon: "i-lucide-chevron-right", to: `/models/${sequence.next.id}` }]
          : []),
      ]
    : [];
  return [
    ...(steps.length ? [steps] : []),
    [{ label: "Tutorial", icon: "i-lucide-graduation-cap", to: TUTORIAL_PATH }],
    [
      { label: sidebarLabel.value, icon: props.sidebarIcons.compact, onSelect: () => emit("toggleSidebar") },
      { label: "Swap sides", icon: "i-lucide-arrow-up-down", onSelect: () => emit("swap") },
    ],
  ];
});
</script>
