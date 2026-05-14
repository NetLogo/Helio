<template>
  <UModal v-model:open="open" scrollable :title="`Embed ${title}`">
    <template #body>
      <UAlert
        v-if="isPrivateModel"
        variant="subtle"
        class="mb-4"
        icon="i-lucide-lock"
        title="Private Model"
        description="This model is private. The embed code will not work for users who do not have access to
          the model."
      >
      </UAlert>
      <UTabs :items="tabs" color="secondary">
        <template #url>
          <div class="space-y-3">
            <p class="text-sm">Copy the URL to the model</p>
            <UFieldGroup class="w-full">
              <UInput :value="embedUrl" readonly class="flex-1" />
              <CopyButton :text="embedUrl" />
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This URL can be used to link users to a live preview of the model "{{ title }}" using
              NetLogo Web.
            </p>
          </div>
        </template>

        <template #html>
          <div class="space-y-3">
            <p class="text-sm">Copy the HTML code to embed the model in a webpage</p>
            <UFieldGroup class="w-full">
              <UTextarea :value="iframeCode" readonly :rows="6" class="flex-1">
                <template #trailing>
                  <CopyButton :text="iframeCode" />
                </template>
              </UTextarea>
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This HTML code can be used to embed a live preview of the model "{{ title }}" using
              NetLogo Web on any webpage that supports iframes.
            </p>
          </div>
        </template>

        <template #markdown>
          <div class="space-y-3">
            <p class="text-sm">Copy the Markdown code to embed the model in a Markdown document</p>
            <UFieldGroup class="w-full">
              <UTextarea :value="markdownCode" readonly :rows="5" class="flex-1">
                <template #trailing>
                  <CopyButton :text="markdownCode" />
                </template>
              </UTextarea>
            </UFieldGroup>

            <USeparator />

            <p class="text-sm text-muted text-pretty">
              This Markdown code can be used to embed a linked preview image of the model "{{
                title
              }}" in any Markdown document.
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
  title: string;
  downloadUrl?: string | null;
  authors: Array<Author>;
  relativeDate: string;
  netlogoVersion?: string | null;
  modelGroup?: string | null;
  modelVisibility?: string;
  embedUrl?: string;
  previewImageUrl?: string | null;
}>();

const open = defineModel({ required: true, type: Boolean });

const tabs = [
  {
    label: "URL",
    icon: "i-lucide-link-2",
    slot: "url",
  },
  {
    label: "HTML",
    slot: "html",
    icon: "i-lucide-code",
  },
  {
    label: "Markdown",
    slot: "markdown",
    icon: "i-lucide-file-text",
  },
];

const isPrivateModel = computed(() => props.modelVisibility === "private");

const iframeCode = computed(() => getNetlogoWebIframeCode(props.downloadUrl ?? "", props.title));
const markdownCode = computed(() =>
  getNetlogoWebMarkdownPreviewCode(
    props.downloadUrl ?? "",
    props.title,
    props.previewImageUrl ?? "",
  ),
);
</script>
