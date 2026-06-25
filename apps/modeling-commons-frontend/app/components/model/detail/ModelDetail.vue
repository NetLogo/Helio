<template>
  <UCard
    :ui="{
      root: 'divide-none',
      body: 'space-y-12 sm:p-8',
    }"
  >
    <section class="space-y-6">
      <ModelEmbedDialog
        v-model="embedDialogOpen"
        :model-id="card.model.id"
        :slug="modelSlug"
        :title="title"
        :authors="card.authors"
        :relative-date="relativeDate"
        :netlogo-version="netlogoVersion"
        :model-visibility="modelVisibility"
        :preview-image-url="previewImageUrl"
      />

      <ModelHeader
        :title="title"
        :authors="card.authors"
        :created-at="card.model.createdAt"
        :netlogo-version="netlogoVersion"
        :download-url="downloadUrl"
        :model-visibility="modelVisibility"
        :preview-image-url="previewImageUrl"
        :permissions="permissions"
        @download="handleDownload"
        @embed="handleEmbed"
        @fork="handleFork"
        @edit="handleEdit"
        @delete="handleDeleteRequest"
      />

      <ConfirmDeleteModelDialog
        v-model:open="deleteOpen"
        :deleting="deleting"
        @confirm="handleDelete"
      />

      <article v-if="card.latestVersion?.description" class="docs prose prose-sm max-w-none">
        <p>{{ card.latestVersion.description }}</p>
      </article>

      <TagList
        :tags="card.tagsOnLatestVersion"
        :editable="permissions.canEdit"
        @add="handleAddTag"
      />
    </section>

    <UCard
      :ui="{
        body: 'relative rounded-xl overflow-hidden aspect-square shrink-0',
      }"
      variant="subtle"
    >
      <NetlogoWebEmbed
        v-if="card.latestVersion"
        class="flex-1"
        :model-url="downloadUrl ?? ''"
        :preview-image-url="previewImageUrl"
        :model-title="title"
        @run="handleRun"
      />
    </UCard>

    <ModelBottomBar
      :likes="stats.likes"
      :downloads="stats.downloads"
      :views="stats.views"
      :runs="stats.runs"
      :liked-by-me="stats.likedByMe"
      :busy="likeBusy"
      @toggle-like="handleToggleLike"
      @share="handleShare"
    />

    <UTabs
      v-model="activeTab"
      :items="tabs"
      color="primary"
      :ui="{ root: 'w-full' }"
      @update:model-value="idx => onTabChange(idx)"
    >
      <template #discussion>
        <ModelDiscussionTab />
      </template>
      <template #files>
        <ModelFilesTab
          :files="attachedFiles"
          :status="filesStatus"
          :viewed-version-number="card.latestVersion?.versionNumber"
          @download="handleFileDownload"
        />
      </template>
      <template #versions>
        <ModelVersionsTab
          :model-id="card.model.id"
          :versions="versions ?? []"
          :pending="versionsStatus === 'pending'"
        />
      </template>
      <template #family>
        <ModelFamilyTab
          :parent="family?.parent ?? null"
          :children="family?.children ?? []"
        />
      </template>
    </UTabs>
  </UCard>
</template>

<script setup lang="ts">
import type { AttachedFile } from "./types";
import { getAuthorUrl, getPrimaryAuthor } from "~/components/model/ModelAuthors.vue";

const props = defineProps<{ card: ModelCard; permissions: UserModelPermissions }>();

type TabKey = "discussion" | "files" | "versions" | "family";

const activeTab = ref<string>('0');

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

const title = computed(() => props.card.latestVersion?.title || "Untitled Model");
const netlogoVersion = computed(() => props.card.latestVersion?.netlogoVersion ?? null);
const modelVisibility = computed(() => props.card.model.visibility);
const relativeDate = computed(() => formatRelativeDate(props.card.model.createdAt));

const embedDialogOpen = ref(false);

const fileDownloadUrls = new Map<string, string>();
const attachedFiles = computed<AttachedFile[]>(() => {
  fileDownloadUrls.clear();
  return (additionalFiles.value ?? []).map((file) => {
    fileDownloadUrls.set(file.id, file.downloadUrl);
    const kind = file.kind ?? "additional";
    return {
      id: file.id,
      title: file.filename,
      description: "",
      type: file.contentType,
      kind,
      taggedVersionNumber: file.taggedVersionNumber,
      versionUrl: `/models/${modelId.value}/versions/${file.taggedVersionNumber}`,
      // @todo: get real file uploader name
      authorName: "Model Author",
      updatedAt: new Date(file.createdAt).toLocaleDateString(),
      isPending: false,
    };
  });
});


const versionTabLabel = computed(() => {
  const count = props.card.model.latestVersionNumber ?? 0;
  return count > 1 ? `Versions (${count})` : "Versions";
});
const tabs = computed<Array<({ label: string; icon: string; slot: TabKey })>>(() => [
  { label: "Discussion", icon: "i-lucide-message-square", slot: "discussion" },
  { label: "Files", icon: "i-lucide-file-text", slot: "files" },
  { label: versionTabLabel.value, icon: "lucide:git-branch", slot: "versions" },
  { label: "Family", icon: "i-lucide-users", slot: "family" },
]);

const downloadUrl = computed(() => {
  if (!props.card?.latestVersion) return undefined;
  return props.card.latestVersion.netlogoFileDownloadUrl;
});
const modelSlug = computed(() => {
  const path = createModelPath(props.card.model.id, title.value);
  return parseModelPath(path)?.modelSlug ?? null;
});

const previewImageUrl = computed(() => {
  if (!props.card?.previewImageUrl) return undefined;
  return appendWindowProtocol(props.card.previewImageUrl);
});

function onTabChange(idx: string | number) {
  const key = tabs.value[Number(idx)]?.slot;
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
    showRequiresLoginToast("like a model");
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
  if (!import.meta.client) return;
  if (!modelId.value) return;
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: props.card?.latestVersion?.title ?? "Model", url });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.add({ title: "Link copied to clipboard" });
    }
    void interactions.recordShare(modelId.value);
  } catch {
    // user cancelled share; no-op
  }
}

function handleAddTag() {
  showComingSoonToast("Add tag button");
}

function handleEmbed() {
  embedDialogOpen.value = true;
}

function handleDownload() {
  if (!modelId.value) return;
  stats.downloads += 1;
  void interactions.recordDownload(modelId.value);
}

function handleFork() {
  showComingSoonToast("Forking models", { icon: "i-lucide-git-fork" });
}

const deleteOpen = ref(false);
const deleting = ref(false);

function handleDeleteRequest() {
  deleteOpen.value = true;
}

async function handleDelete() {
  if (!modelId.value) return;
  deleting.value = true;
  try {
    const api = useApi();
    const { data, error } = await api.DELETE("/api/v1/models/{id}", {
      params: { path: { id: modelId.value } },
    });
    handleApiError(data, error, "deleting model");
    deleteOpen.value = false;
    toast.add({ title: "Model deleted", color: "success" });
    await navigateTo(getAuthorUrl(getPrimaryAuthor(props.card.authors)));
  } finally {
    deleting.value = false;
  }
}

function handleEdit() {
  if (!modelId.value) return;
  const path = modelSlug.value
    ? `/models/${modelSlug.value}/${modelId.value}/edit`
    : `/models/${modelId.value}/edit`;
  void navigateTo(path);
}

function handleRun() {
  if (!modelId.value) return;
  stats.runs += 1;
  void interactions.recordRun(modelId.value);
}

function handleFileDownload(fileId: string) {
  const url = fileDownloadUrls.get(fileId);
  if (!url) return;

  const validResponse = checkValidCdnUrl(url);
  if (!validResponse.success) {
    toastLinkExpired();
    return;
  }

  if (url) window.open(url, "_blank");
}
</script>
