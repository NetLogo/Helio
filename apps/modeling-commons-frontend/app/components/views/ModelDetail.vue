<template>
  <UCard
    :ui="{
      root: 'divide-none',
      body: 'space-y-12 sm:p-8',
    }"
  >
    <section class="space-y-6">
      <ModelHeader
        :title="card.latestVersion?.title || 'Untitled Model'"
        :authors="authors"
        :primary-author="primaryAuthor"
        :created-at="card.model.createdAt"
        :netlogo-version="card.latestVersion?.netlogoVersion"
        :download-url="downloadUrl"
        :model-visibility="card.model.visibility"
        :preview-image-url="previewImageUrl"
        @embed="handleEmbed"
        @download="handleDownload"
      />

      <article v-if="card.latestVersion?.description" class="docs prose prose-sm max-w-none">
        <p>{{ card.latestVersion.description }}</p>
      </article>

      <TagList
        v-if="card.tagsOnLatestVersion.length > 0"
        :tags="card.tagsOnLatestVersion"
        editable
        @add="handleAddTag"
      />
    </section>

    <NetlogoWebEmbed
      v-if="card.latestVersion"
      class="flex-1"
      :model-url="downloadUrl ?? ''"
      :preview-image-url="previewImageUrl"
      :model-title="card.latestVersion.title ?? 'NetLogo Model'"
      @run="handleRun"
    />

    <ModelStats
      :likes="stats.likes"
      :downloads="stats.downloads"
      :views="stats.views"
      :runs="stats.runs"
      :liked-by-me="stats.likedByMe"
      :busy="likeBusy"
      @toggle-like="handleToggleLike"
      @share="handleShare"
      @compare="handleCompare"
    />

    <section class="rounded-xl border border-default overflow-hidden">
      <div class="flex border-b border-default">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 -mb-px"
          :class="
            activeTab === tab.key
              ? 'border-primary-600 text-highlighted'
              : 'border-transparent text-muted hover:text-toned'
          "
          @click="onTabChange(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
      <ModelDiscussionTab v-if="activeTab === 'discussion'" />

      <ModelFilesTab
        v-else-if="activeTab === 'files'"
        :files="attachedFiles"
        :status="filesStatus"
        @download="handleFileDownload"
      />

      <ModelVersionsTab
        v-else-if="activeTab === 'versions'"
        :model-id="card.model.id"
        :versions="versions ?? []"
        :pending="versionsStatus === 'pending'"
      />

      <ModelFamilyTab
        v-else-if="activeTab === 'family'"
        :parent="family?.parent ?? null"
        :children="family?.children ?? []"
      />
    </section>
  </UCard>
</template>

<script setup lang="ts">
import type { AttachedFile } from "../model-detail/types";

const props = defineProps<{ card: ModelCard }>();

type TabKey = "discussion" | "files" | "versions" | "family";

const activeTab = ref<TabKey>("discussion");

const user = useUser();
const modelId = computed(() => props.card?.model.id ?? "");
const { data: family, execute: loadFamily, status: familyStatus } = useModelFamilyCard(modelId);
const {
  data: versions,
  execute: loadVersions,
  status: versionsStatus,
} = useModelVersions(modelId, { immediate: false });
const {
  data: additionalFiles,
  execute: loadFiles,
  status: filesStatus,
} = useModelAdditionalFiles(modelId, { immediate: false });

const fileDownloadUrls = new Map<string, string>();
const attachedFiles = computed<AttachedFile[]>(() => {
  fileDownloadUrls.clear();
  return (additionalFiles.value ?? []).map((file) => {
    fileDownloadUrls.set(file.id, file.downloadUrl);
    return {
      id: file.id,
      title: file.filename,
      description: "",
      type: file.contentType,
      authorName: primaryAuthor.value?.name ?? "",
      updatedAt: new Date(file.createdAt).toLocaleDateString(),
      isPending: false,
    };
  });
});

const tabs = computed(() => [
  { key: "discussion" as const, label: "Discussion" },
  { key: "files" as const, label: "Files" },
  { key: "versions" as const, label: `Versions (${props.card?.counts.versions ?? 0})` },
  { key: "family" as const, label: "Family" },
]);

const authors = computed(() =>
  (props.card?.authors ?? []).map((a) => ({
    name: a.userName ?? "Unknown",
    image: a.userImage ?? undefined,
  })),
);

const primaryAuthor = computed(() => authors.value[0]);

const downloadUrl = computed(() => {
  if (!props.card?.latestVersion) return null;
  return props.card.latestVersion.netlogoFileDownloadUrl;
});

const previewImageUrl = computed(() => {
  if (!props.card?.previewImageUrl) return null;
  return appendWindowProtocol(props.card.previewImageUrl);
});

function onTabChange(key: TabKey) {
  activeTab.value = key;
  if (key === "family" && familyStatus.value === "idle") {
    void loadFamily();
  }
  if (key === "versions" && versionsStatus.value === "idle") {
    void loadVersions();
  }
  if (key === "files" && filesStatus.value === "idle") {
    void loadFiles();
  }
}

const interactions = useModelInteractions();
const toast = useToast();

type CardStats = {
  likes: number;
  downloads: number;
  views: number;
  runs: number;
  shares: number;
  likedByMe: boolean;
};

const initialStats = computed<CardStats>(() => {
  const s = (props.card as unknown as { stats?: Partial<CardStats> })?.stats ?? {};
  return {
    likes: s.likes ?? 0,
    downloads: s.downloads ?? 0,
    views: s.views ?? 0,
    runs: s.runs ?? 0,
    shares: s.shares ?? 0,
    likedByMe: s.likedByMe ?? false,
  };
});

const stats = reactive({ ...initialStats.value });
watch(initialStats, (next) => Object.assign(stats, next));

const likeBusy = ref(false);

onMounted(() => {
  if (modelId.value) void interactions.recordView(modelId.value);
});

async function handleToggleLike() {
  if (!modelId.value || likeBusy.value) return;
  if (!user.value.isLoggedIn) {
    toast.add({ title: "You must be logged in to like a model", color: "warning" });
    return;
  }
  likeBusy.value = true;
  const wasLiked = stats.likedByMe;
  stats.likedByMe = !wasLiked;
  stats.likes += wasLiked ? -1 : 1;
  try {
    if (wasLiked) {
      await interactions.unlike(modelId.value);
    } else {
      await interactions.like(modelId.value);
    }
  } catch {
    stats.likedByMe = wasLiked;
    stats.likes += wasLiked ? 1 : -1;
    toast.add({ title: "Failed to update like", color: "error" });
  } finally {
    likeBusy.value = false;
  }
}

async function handleShare() {
  if (!modelId.value) return;
  const url = typeof window !== "undefined" ? window.location.href : "";
  try {
    if (navigator.share) {
      await navigator.share({ title: props.card?.latestVersion?.title ?? "Model", url });
    } else if (url && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.add({ title: "Link copied to clipboard" });
    }
    void interactions.recordShare(modelId.value);
  } catch {
    // user cancelled share; no-op
  }
}

function handleEmbed() {}
function handleAddTag() {}
function handleCompare() {}

function handleDownload() {
  if (!modelId.value) return;
  stats.downloads += 1;
  void interactions.recordDownload(modelId.value);
}

function handleRun() {
  if (!modelId.value) return;
  stats.runs += 1;
  void interactions.recordRun(modelId.value);
}

function handleFileDownload(fileId: string) {
  const url = fileDownloadUrls.get(fileId);
  if (url) window.open(url, "_blank");
}
</script>
