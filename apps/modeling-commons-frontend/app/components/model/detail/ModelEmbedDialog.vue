<template>
  <UModal v-model:open="open" scrollable :title="`Embed ${title}`">
    <template #body>
      <UAlert
        v-if="isPrivateModel"
        variant="subtle"
        class="mb-4"
        icon="i-lucide-lock"
        title="Private Model"
          description="This model is private. The embed will show a locked state to viewers who aren't signed
          in or who don't have access."
      >
      </UAlert>
      <UTabs :items="tabs" color="secondary">
        <template #url>
          <div class="space-y-3">
            <p class="text-sm">Copy the URL to share a live preview of the model</p>
            <UFieldGroup class="w-full">
              <UInput :value="embedPageUrl" readonly class="flex-1" :ui="{ base: 'scrollbar-hidden'}" />
              <CopyButton :text="embedPageUrl" />
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This URL opens a hosted preview of "{{ title }}" on Modeling Commons.
            </p>
          </div>
        </template>

        <template #html>
          <div class="space-y-3">
            <p class="text-sm">Copy the HTML code to embed the model in a webpage</p>
            <UFieldGroup class="w-full">
              <UTextarea :value="iframeCode" readonly :rows="6" class="flex-1" :ui="{ base: 'scrollbar-hidden'}">
                <template #trailing>
                  <CopyButton :text="iframeCode" />
                </template>
              </UTextarea>
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This HTML code embeds "{{ title }}" on any page that supports iframes. Viewers will
              see the model's thumbnail and click to run it.
            </p>
          </div>
        </template>

        <template #markdown>
          <div class="space-y-3">
            <p class="text-sm">Copy the Markdown code to embed the model in a Markdown document</p>
            <UFieldGroup class="w-full">
              <UTextarea :value="markdownCode" readonly :rows="5" class="flex-1" :ui="{ base: 'scrollbar-hidden'}">
                <template #trailing>
                  <CopyButton :text="markdownCode" />
                </template>
              </UTextarea>
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This Markdown code embeds a linked preview image of "{{ title }}" in any Markdown
              document.
            </p>
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import type { Author } from "../ModelAuthors.vue";

const props = defineProps<{
  modelId: string;
  slug?: string | null;
  title: string;
  authors: Array<Author>;
  relativeDate: string;
  netlogoVersion?: string | null;
  modelGroup?: string | null;
  modelVisibility?: string;
  previewImageUrl?: string | null;
}>();

const open = defineModel({ required: true, type: Boolean });

const appUrl = useRuntimeConfig().public.appUrl as string;

const tabs = [
  { label: "URL", icon: "i-lucide-link-2", slot: "url" },
  { label: "HTML", slot: "html", icon: "i-lucide-code" },
  { label: "Markdown", slot: "markdown", icon: "i-lucide-file-text" },
];

const isPrivateModel = computed(() => props.modelVisibility === "private");

const target = computed(() => ({
  modelId: props.modelId,
  slug: props.slug ?? null,
  appUrl,
}));

const embedPageUrl = computed(() => getModelEmbedUrl(target.value));
const iframeCode = computed(() => getModelEmbedIframeCode(target.value, props.title));
const markdownCode = computed(() =>
  getModelEmbedMarkdownCode(target.value, props.title, props.previewImageUrl ?? null),
);
</script>