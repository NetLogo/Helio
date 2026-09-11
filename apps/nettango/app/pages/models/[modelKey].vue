<template>
  <UPage class="no-stylized-heading">
    <UContainer>
      <UBreadcrumb :items="breadcrumbs" class="mt-8" />
      <ModelHeader v-if="model" :model="model" class="my-8" />
      <USeparator v-if="model" class="mb-8" icon="netlogo-turtles" />
    </UContainer>
    <iframe
      v-if="model"
      ref="player"
      :src="model.player"
      :title="`${model.title} NetTango model`"
      class="block w-full border-0 bg-white px-(--space-xl)"
      :style="{ height: `${height}px` }"
      allow="fullscreen"
      @load="observePlayer"
    />
    <ErrorDisplay
      v-else
      :error-code="404"
      error-details="The requested model could not be found."
    />
  </UPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "clean",
});
const route = useRoute();
const modelKey = route.params.modelKey as string;

const model = useModels().find((m) => m.id === modelKey);

const player = useTemplateRef<HTMLIFrameElement>("player");
const height = ref(model?.frameHeight ?? 800);
let observer: ResizeObserver | undefined;

const observePlayer = () => {
  const doc = player.value?.contentDocument;
  const win = player.value?.contentWindow;
  if (!doc?.documentElement || !win) {
    height.value = 1400;
    return;
  }

  const sync = () => {
    height.value = doc.documentElement.scrollHeight;
  };

  sync();
  observer?.disconnect();
  observer = new ResizeObserver(sync);
  observer.observe(doc.documentElement);
  observer.observe(doc.body);
};

onMounted(() => {
  if (player.value?.contentDocument?.readyState === "complete") observePlayer();
});

onBeforeUnmount(() => observer?.disconnect());

if (model) {
  useSeoMeta({ title: model.title, description: model.description });
} else {
  useHead({
    title: "Model Not Found",
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  });
}

const breadcrumbs = ref<import("#ui/types").BreadcrumbItem[]>([
  { label: "Home", to: "/" },
  { label: "Model Gallery", to: "/models-gallery" },
  { label: model?.title ?? "Not Found", to: `/models/${modelKey}` },
]);
</script>
