<template>
  <NuxtLayout name="app" class="no-stylized-heading">
    <template #bar>
      <ModelAppBar
        :model="model"
        :sidebar-visible="sidebarVisible"
        :sidebar-icons="sidebarIcons"
        :swapped="swapped"
        @toggle-sidebar="toggleSidebar"
        @swap="swapped = !swapped"
        @reset-split="split?.reset()"
      />
    </template>

    <!-- One split for every model, not one per model: a teacher sets it once. -->
    <NtSplitPane
      v-if="model"
      ref="split"
      storage-key="model-app-view"
      label="Resize model and details"
      :initial-ratio="queryRatio"
      :hide-end="sidebarState"
      :reversed="swapped"
    >
      <template #start>
        <iframe
          :src="model.player"
          :title="`${model.title} NetTango model`"
          class="block size-full border-0 bg-white"
          allow="fullscreen"
        />
      </template>
      <template #end>
        <div class="min-h-full bg-muted p-3">
          <ModelSidebar :model="model" class="lg:w-full" />
        </div>
      </template>
    </NtSplitPane>
    <ErrorDisplay v-else :error-code="404" error-details="The requested model could not be found." />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

definePageMeta({ layout: false });

const route = useRoute();
const modelKey = route.params.modelKey as string;
const model = useModels().find((m) => m.id === modelKey);

const queryRatio = splitFromQuery(route.query.split);
const sidebarState = ref<boolean | "compact">(sidebarHiddenFromQuery(route.query.sidebar) ? true : "compact");
const swapped = ref(false);
const isDesktop = ref(false);
const split = useTemplateRef<{ reset: () => void }>("split");

const sidebarVisible = computed(
  () => sidebarState.value === false || (sidebarState.value === "compact" && isDesktop.value),
);
// One icon per breakpoint, chosen in CSS, so the SSR markup is already right before isDesktop is known.
const sidebarIcons = computed(() => ({
  desktop: `i-lucide-panel-${swapped.value ? "left" : "right"}-${sidebarState.value === true ? "open" : "close"}`,
  compact: `i-lucide-panel-${swapped.value ? "top" : "bottom"}-${sidebarState.value === false ? "close" : "open"}`,
}));

const toggleSidebar = () => {
  sidebarState.value = sidebarVisible.value;
};

onMounted(() => {
  const query = window.matchMedia("(min-width: 64rem)");
  isDesktop.value = query.matches;
  useEventListener(query, "change", (event: MediaQueryListEvent) => {
    isDesktop.value = event.matches;
  });
});

if (model) {
  useSeoMeta({ title: model.title, description: model.description, });
} else {
  useHead({
    title: "Model Not Found",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  });
}
</script>
