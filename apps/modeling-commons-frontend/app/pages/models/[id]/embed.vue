<template>
  <div class="embed-root relative h-dvh w-full overflow-hidden bg-neutral-lightest">
    <ModelDetailSkeleton v-if="status === 'pending'" class="p-6" />

    <div
      v-else-if="isAccessDenied"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <Icon name="material-symbols:lock-outline" class="size-12 text-muted" />
      <div class="space-y-1">
        <p class="font-medium text-highlighted">This model is private</p>
        <p class="text-sm text-muted max-w-sm">
          Sign in to your Modeling Commons account to view it here.
        </p>
      </div>
      <UButton
        v-if="canRequestStorageAccess"
        color="primary"
        variant="solid"
        @click="onRequestStorageAccess"
      >
        Continue with my session
      </UButton>
      <UButton :to="loginUrl" target="_blank" rel="noopener" variant="outline">
        Sign in (opens new tab)
      </UButton>
    </div>

    <Error v-else-if="error || !card" class="absolute inset-0 p-6" title="Failed to load model">
      <UButton variant="outline" @click="refresh()">Try Again</UButton>
    </Error>

    <NetlogoWebEmbed
      v-else
      class="flex-1"
      :model-url="downloadUrl ?? ''"
      :preview-image-url="previewImageUrl"
      :model-title="title"
      @run="handleRun"
    />

    <div
      class="absolute bottom-2 right-2 z-20 px-2 py-1 rounded-full bg-default/80 backdrop-blur text-xs text-muted hover:text-highlighted"
    >
      Powered by
      <NuxtLink :to="modelPageUrl" target="_blank" rel="noopener" @click.stop>
        Modeling Commons
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const modelId = computed(() => route.params.id as string);

const config = useRuntimeConfig();
const appUrl = config.public.appUrl as string;

const { data: card, error, status, refresh } = useModelCard(modelId);

const isAccessDenied = computed(() => {
  if (!error.value) return false;
  const e = error.value as { status?: number; response?: { status?: number } };
  const status = e?.status ?? e?.response?.status;
  return status === 401 || status === 403 || status === 404;
});

const title = computed(() => card.value?.latestVersion?.title ?? "NetLogo Model");
const downloadUrl = computed(() => card.value?.latestVersion?.netlogoFileDownloadUrl ?? "");
const previewImageUrl = computed(() => {
  const url = card.value?.previewImageUrl;
  return url ? appendWindowProtocol(url) : null;
});

const modelPageUrl = computed(() => {
  if (!card.value?.model.id) return appUrl;
  return new URL(createModelPath(card.value.model.id, title.value), appUrl).toString();
});

const loginUrl = computed(() => {
  const next = `/models/${modelId.value}/embed`;
  const url = new URL(authRoutes.login, appUrl);
  url.searchParams.set("next", next);
  return url.toString();
});

const interactions = useModelInteractions();

onMounted(() => {
  if (modelId.value && card.value) void interactions.recordView(modelId.value);
});

const canRequestStorageAccess = ref(false);
onMounted(async () => {
  if (!isAccessDenied.value) return;
  if (typeof document === "undefined") return;
  const d = document as Document & { hasStorageAccess?: () => Promise<boolean> };
  if (typeof d.hasStorageAccess !== "function") return;
  try {
    const has = await d.hasStorageAccess();
    canRequestStorageAccess.value = !has;
  } catch {
    canRequestStorageAccess.value = true;
  }
});

async function onRequestStorageAccess() {
  const d = document as Document & { requestStorageAccess?: () => Promise<void> };
  if (typeof d.requestStorageAccess !== "function") return;
  try {
    await d.requestStorageAccess();
    await refresh();
  } catch {
    // user declined or browser denied
  }
}

useSeoMeta({
  title: () => `Embed: ${title.value}`,
  robots: "noindex, nofollow",
});

function handleRun() {
  if (!modelId.value) return;
  void interactions.recordRun(modelId.value);
}
</script>
