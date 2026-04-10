<template>
  <div v-if="store.model" class="space-y-8">
    <ModelHeader
      :title="store.currentVersion?.title || 'Untitled Model'"
      :author="primaryAuthor"
      :created-at="store.model.createdAt"
      :netlogo-version="store.currentVersion?.netlogoVersion"
      :download-url="downloadUrl"
      @embed="handleEmbed"
    />

    <div v-if="store.currentVersion?.description" class="docs prose prose-sm max-w-none">
      <p>{{ store.currentVersion.description }}</p>
    </div>

    <TagList v-if="store.tags.length > 0" :tags="store.tags" editable @add="handleAddTag" />

    <NLWEmbed
      v-if="store.currentVersion?.nlogoxFileId"
      :model-url="`${apiBase}/${getFileUrl(store.currentVersion.nlogoxFileId)}`"
    />

    <ModelStats
      :likes="0"
      :downloads="0"
      :views="0"
      :runs="0"
      @like="handleLike"
      @share="handleShare"
      @compare="handleCompare"
    />

    <div class="rounded-xl border border-default overflow-hidden">
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
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <ModelDiscussionTab v-if="activeTab === 'discussion'" />

      <ModelFilesTab v-else-if="activeTab === 'files'" :files="[]" @download="handleFileDownload" />

      <ModelVersionsTab
        v-else-if="activeTab === 'versions'"
        :versions="versionRows"
        @download="handleVersionDownload"
      />

      <ModelFamilyTab
        v-else-if="activeTab === 'family'"
        :parent="familyParent"
        :children="familyChildren"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FamilyModel, VersionRow } from "~/components/model-detail/types";
import NLWEmbed from "./netlogo-web/NLWEmbed.vue";

const store = useModelDetailStore();
const apiBase = useRuntimeConfig().public.apiBase;

type TabKey = "discussion" | "files" | "versions" | "family";

const activeTab = ref<TabKey>("discussion");

const tabs = computed(() => [
  { key: "discussion" as const, label: "Discussion" },
  { key: "files" as const, label: "Files" },
  { key: "versions" as const, label: `Versions (${store.versions.length})` },
  { key: "family" as const, label: "Family" },
]);

const primaryAuthor = computed(() => {
  const author = store.authors[0];
  if (!author) return undefined;
  return { name: author.userName || "Unknown", image: author.userImage };
});

const downloadUrl = computed(() => {
  const fileId = store.currentVersion?.nlogoxFileId;
  if (!fileId) return null;
  return `${apiBase}/api/v1/files/${fileId}/download`;
});

const versionRows = computed<VersionRow[]>(() =>
  store.versions.map((v) => ({
    versionNumber: v.versionNumber,
    title: v.title,
    description: v.description,
    uploaderName: null,
    nlogoxFileId: v.nlogoxFileId,
    createdAt: v.createdAt,
    isFinalized: v.isFinalized,
  })),
);

const familyParent = ref<FamilyModel | null>(null);
const familyChildren = ref<FamilyModel[]>([]);

async function fetchFamilyModel(
  modelId: string,
  linkedVersionId?: string | null,
): Promise<FamilyModel | null> {
  const { GET } = useApi();

  const [modelRes, versionsRes, authorsRes] = await Promise.all([
    GET("/api/v1/models/{id}", { params: { path: { id: modelId } } }),
    GET("/api/v1/models/{id}/versions", {
      params: { path: { id: modelId }, query: { limit: 50 } },
    }),
    GET("/api/v1/models/{id}/authors", { params: { path: { id: modelId } } }),
  ]);

  if (modelRes.error) return null;

  const model = modelRes.data as {
    id: string;
    createdAt: string;
    visibility: string;
    isEndorsed: boolean;
  };
  const versionsData = versionsRes.data as
    | {
        count: number;
        data: { id: string; title: string; description: string | null; versionNumber: number }[];
      }
    | undefined;
  const versions = versionsData?.data ?? [];
  const latestVersion = versions[0];

  let linkedVersionNumber: number | null = null;
  if (linkedVersionId) {
    linkedVersionNumber = versions.find((v) => v.id === linkedVersionId)?.versionNumber ?? null;
  }

  const authors = authorsRes.data as { userId: string; role: string }[] | undefined;
  const ownerId = authors?.find((a) => a.role === "owner")?.userId ?? authors?.[0]?.userId;

  let authorName: string | null = null;
  if (ownerId) {
    const { data: userData } = await GET("/api/v1/users/{id}", {
      params: { path: { id: ownerId } },
    });
    authorName = (userData as { name: string | null } | undefined)?.name ?? null;
  }

  return {
    id: model.id,
    title: latestVersion?.title ?? "Untitled",
    description: latestVersion?.description ?? null,
    visibility: model.visibility,
    isEndorsed: model.isEndorsed,
    createdAt: model.createdAt,
    authorName,
    versionCount: versionsData?.count ?? 0,
    linkedVersionNumber,
  };
}

async function fetchFamily() {
  if (!store.model) return;

  const { GET } = useApi();

  if (store.model.parentModelId) {
    familyParent.value = await fetchFamilyModel(
      store.model.parentModelId,
      store.model.parentVersionId,
    );
  } else {
    familyParent.value = null;
  }

  const childrenRes = await GET("/api/v1/models/{id}/children", {
    params: { path: { id: store.model.id }, query: { limit: 50 } },
  });
  const childrenData = childrenRes.data as
    | { data: { id: string; parentVersionId: string | null }[] }
    | undefined;
  const childEntries = childrenData?.data ?? [];

  const resolved = await Promise.all(childEntries.map((child) => fetchFamilyModel(child.id)));
  familyChildren.value = childEntries
    .map((child, i) => {
      const model = resolved[i];
      if (!model) return null;
      const linkedVersion = child.parentVersionId
        ? store.versions.find((v) => v.id === child.parentVersionId)
        : null;
      return { ...model, linkedVersionNumber: linkedVersion?.versionNumber ?? null };
    })
    .filter((m): m is FamilyModel => m !== null);
}

watch(
  () => store.model?.id,
  (id) => {
    if (id) fetchFamily();
  },
);

function handleEmbed() {
  // TODO: implement embed modal
}

function handleAddTag() {
  // TODO: implement add tag
}

function handleLike() {
  // TODO: implement like
}

function handleShare() {
  // TODO: implement share
}

function handleCompare() {
  // TODO: implement compare
}

function handleFileDownload(fileId: string) {
  window.open(`${apiBase}/${getFileUrl(fileId)}`, "_blank");
}

function handleVersionDownload(fileId: string) {
  window.open(`${apiBase}/${getFileUrl(fileId)}`, "_blank");
}
</script>
