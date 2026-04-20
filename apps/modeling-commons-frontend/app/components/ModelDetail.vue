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
      v-if="card.latestVersion && previewImageUrl"
      class="flex-1"
      :model-url="downloadUrl ?? ''"
      :preview-image-url="previewImageUrl"
      :model-title="card.latestVersion.title ?? 'NetLogo Model'"
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

      <ModelFilesTab v-else-if="activeTab === 'files'" :files="[]" @download="handleFileDownload" />

      <ModelVersionsTab
        v-else-if="activeTab === 'versions'"
        :versions="versionRows"
        @download="handleVersionDownload"
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
import type { VersionRow } from "~/components/model-detail/types";

const props = defineProps<{ card: ModelCard }>();

type TabKey = "discussion" | "files" | "versions" | "family";

const activeTab = ref<TabKey>("discussion");

const modelId = computed(() => props.card?.model.id ?? "");
const { data: family, execute: loadFamily, status: familyStatus } = useModelFamilyCard(modelId);

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

const apiBase = useRuntimeConfig().public.apiBase;

const downloadUrl = computed(() => {
  if (!props.card?.latestVersion) return null;
  return props.card.latestVersion.netlogoFileDownloadUrl;
});

const previewImageUrl = computed(() => {
  if (!props.card?.previewImageUrl) return null;
  return appendWindowProtocol(props.card.previewImageUrl);
});

const versionRows = computed<VersionRow[]>(() => {
  if (!props.card?.latestVersion) return [];
  const v = props.card.latestVersion;
  return [
    {
      versionNumber: v.versionNumber,
      title: v.title,
      description: v.description,
      uploaderName: null,
      netlogoFileDownloadUrl: v.netlogoFileDownloadUrl,
      createdAt: v.createdAt,
      isFinalized: v.isFinalized,
    },
  ];
});

function onTabChange(key: TabKey) {
  activeTab.value = key;
  if (key === "family" && familyStatus.value === "idle") {
    void loadFamily();
  }
}

function handleEmbed() {}
function handleAddTag() {}
function handleLike() {}
function handleShare() {}
function handleCompare() {}

function handleFileDownload(fileId: string) {
  window.open(`${apiBase}/${getFileURI(fileId)}`, "_blank");
}

function handleVersionDownload(_fileId: string) {
  if (downloadUrl.value) window.open(downloadUrl.value, "_blank");
}
</script>
