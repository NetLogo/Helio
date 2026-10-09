<template>
  <UCard as="section" :aria-labelledby="titleId" class="lg:w-80">
    <div class="flex flex-col gap-3">
      <div v-if="model.tags.length" class="flex flex-wrap gap-1">
        <UBadge v-for="tag in model.tags" :key="tag" :label="tag" variant="subtle" size="sm" />
      </div>
      <div>
        <h1 :id="titleId" class="text-xl font-bold text-highlighted lg:text-2xl">
          {{ model.title }}
        </h1>
        <p class="mt-1 text-sm text-muted">By {{ authorList }}</p>
      </div>
      <div class="flex flex-col items-start gap-1">
        <p
          :id="descriptionId"
          ref="description"
          class="text-sm text-toned"
          :class="{ 'max-lg:line-clamp-3': !descriptionExpanded }"
        >
          {{ model.description }}
        </p>
        <UButton
          v-if="descriptionClamped || descriptionExpanded"
          variant="link"
          size="xs"
          class="px-0 lg:hidden"
          :label="descriptionExpanded ? 'Less' : 'More'"
          :aria-expanded="descriptionExpanded"
          :aria-controls="descriptionId"
          @click="descriptionExpanded = !descriptionExpanded"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          :to="editorUrl"
          external
          target="_blank"
          size="sm"
          icon="i-lucide-pencil"
          trailing-icon="i-lucide-arrow-up-right"
          label="Open in Builder"
        />
        <UButton
          :to="model.project"
          external
          download
          size="sm"
          variant="subtle"
          color="neutral"
          icon="i-lucide-download"
          label="Download project file"
        />
      </div>
    </div>

    <USeparator class="my-4" />

    <UButton
      color="neutral"
      variant="ghost"
      block
      class="justify-between"
      label="Teaching guide"
      icon="i-lucide-book-open"
      :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :aria-expanded="open"
      :aria-controls="contentId"
      @click="open = !open"
    />

    <UCollapsible
      v-model:open="open"
      :unmount-on-hide="false"
      :ui="{
        content:
          'motion-reduce:data-[state=open]:animate-none! motion-reduce:data-[state=closed]:animate-none!',
      }"
    >
      <template #content>
        <div :id="contentId" class="flex flex-col gap-6 pt-4 text-sm">
          <section class="flex flex-col gap-2">
            <h2 class="text-base font-semibold text-highlighted">Tips for class</h2>
            <ul v-if="tips.length" class="m-0 flex list-disc flex-col gap-2 pl-5 text-toned">
              <li v-for="tip in tips" :key="tip" class="m-0">{{ tip }}</li>
            </ul>
            <p v-else class="text-muted">No tips yet.</p>
          </section>

          <template v-if="position">
            <USeparator />

            <section class="flex flex-col gap-3">
              <h2 class="text-base font-semibold text-highlighted">Models in this sequence</h2>
              <div class="flex flex-col gap-2">
                <UBadge
                  :label="`Step ${position.step} of ${position.total} in ${position.title}`"
                  icon="i-lucide-list-ordered"
                  class="self-start"
                />
                <div class="flex flex-wrap justify-between gap-2">
                  <UButton
                    v-if="previous"
                    :to="`/models/${previous.id}`"
                    size="xs"
                    variant="link"
                    icon="i-lucide-chevron-left"
                    :label="previous.title"
                    :aria-label="`Previous step: ${previous.title}`"
                  />
                  <UButton
                    v-if="next"
                    :to="`/models/${next.id}`"
                    size="xs"
                    variant="link"
                    trailing-icon="i-lucide-chevron-right"
                    class="ml-auto"
                    :label="next.title"
                    :aria-label="`Next step: ${next.title}`"
                  />
                </div>
              </div>
            </section>
          </template>

          <template v-if="related.length">
            <USeparator />

            <section class="flex flex-col gap-3">
              <h2 class="text-base font-semibold text-highlighted">Related models</h2>
              <ul class="m-0 flex flex-col gap-2 p-0">
                <li v-for="item in related" :key="item.id" class="m-0">
                  <ULink
                    :to="`/models/${item.id}`"
                    :aria-label="item.title"
                    class="flex items-center gap-3 rounded-lg border border-default p-2 hover:bg-elevated"
                  >
                    <div class="w-12 shrink-0 overflow-hidden rounded-md">
                      <ModelThumbnail :model="item" />
                    </div>
                    <span class="font-medium text-highlighted">{{ item.title }}</span>
                  </ULink>
                </li>
              </ul>
            </section>
          </template>

          <USeparator />

          <section class="flex flex-col gap-3">
            <h2 class="text-base font-semibold text-highlighted">Lesson and details</h2>
            <ULink
              v-if="details?.lesson"
              :to="details.lesson.url"
              external
              target="_blank"
              rel="noopener"
              :aria-label="`Lesson: ${details.lesson.title}`"
              class="flex items-center gap-2 font-medium text-primary"
            >
              <UIcon name="i-lucide-book-open" class="size-4 shrink-0" />
              <span>{{ details.lesson.title }}, {{ details.lesson.provider }}</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0" />
            </ULink>
            <p v-else class="text-muted">No lesson yet.</p>
            <dl v-if="facts.length" class="m-0 flex flex-col gap-2 p-0">
              <div v-for="fact in facts" :key="fact.label">
                <dt class="text-muted">{{ fact.label }}</dt>
                <dd class="m-0 text-toned">{{ fact.value }}</dd>
              </div>
            </dl>
          </section>

          <USeparator />

          <section class="flex flex-col gap-2">
            <h2 class="text-base font-semibold text-highlighted">What to expect</h2>
            <figure v-if="preview" class="flex flex-col gap-2">
              <img
                :src="preview"
                :alt="`A sample run of ${model.title}`"
                class="aspect-square w-full rounded-lg bg-neutral-900 object-cover"
                loading="lazy"
              />
              <figcaption class="text-muted">
                A finished model, run step by step. Your students' runs will differ with the blocks
                they choose.
              </figcaption>
            </figure>
            <p v-else class="text-muted">No preview yet.</p>
          </section>
        </div>
      </template>
    </UCollapsible>
  </UCard>
</template>

<script setup lang="ts">
import { useMediaQuery, useResizeObserver } from "@vueuse/core";
import type { GalleryModel } from "~/composables/useModels";

const props = defineProps<{ model: GalleryModel }>();

const titleId = useId();
const contentId = useId();
const descriptionId = useId();

const description = useTemplateRef<HTMLParagraphElement>("description");
const descriptionExpanded = ref(false);
const descriptionClamped = ref(false);
useResizeObserver(description, ([entry]) => {
  const el = entry?.target as HTMLElement | undefined;
  if (el && !descriptionExpanded.value)
    descriptionClamped.value = el.scrollHeight > el.clientHeight;
});

const editorUrl = useModelEditorUrl(props.model);
const authorList = computed(() => new Intl.ListFormat("en").format(props.model.authors));

const curation = useModelCuration();
const models = useModels();
const details = computed(() => modelMetadata(curation, props.model.id));
const position = computed(() => sequencePosition(curation, props.model.id));
const tips = computed(() => details.value?.tips ?? []);

const findModel = (id: string | null | undefined) =>
  id ? resolveModels([id], models)[0] : undefined;
const previous = computed(() => findModel(position.value?.previous));
const next = computed(() => findModel(position.value?.next));
const related = computed(() => resolveModels(details.value?.related ?? [], models, props.model.id));

const facts = computed(() => {
  const meta = details.value;
  if (!meta) return [];
  const list = new Intl.ListFormat("en");
  return [
    { label: "Subject", value: list.format(meta.subjects) },
    { label: "Grade band", value: list.format(gradeBandLabels(meta.gradeBands)) },
    { label: "Creators", value: list.format(meta.creators) },
    { label: "Based on", value: meta.basedOn ?? "" },
    { label: "License", value: meta.license ?? "" },
  ].filter((fact) => fact.value);
});

const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
const preview = computed(() => previewSource(props.model, reducedMotion.value));

const open = ref(false);
onMounted(() => {
  open.value = window.matchMedia("(min-width: 1024px)").matches;
});
</script>
