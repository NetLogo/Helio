<template>
  <UTooltip
    v-if="primitive && primitive.name"
    :ui="{ content: 'primitive-tooltip ring-0 bg-transparent shadow-none ' }"
    :content="{
      side: 'top',
      sideOffset: 50,
      align: 'start',
      ariaLabel: `Details about the ${primitive.name} NetLogo primitive`,
    }"
    :delay-duration="300"
    :disabled="isNested"
  >
    <code class="netlogo-command" :primitive-name="primitive.name">
      <Anchor
        :href="primitive.url"
        class="netlogo-wiki-link"
        :data-display-text="primitive.name"
        :target="external ? '_blank' : '_self'"
        :rel="external ? 'noopener noreferrer' : null"
        >{{ props.name }}</Anchor
      >
    </code>

    <template #content>
      <UPageCard
        varian="outline"
        class="primitive-tooltip-content animate-scale-in relative p-0 min-w-[300px] lg:min-w-[500px] max-w-[600px] max-h-[250px] [&_p]:mb-3 overflow-y-auto no-stylized-heading"
        as="div"
        :ui="{
          container: 'p-4! pt-0!  gap-y-1! h-full max-w-[600px] [&_pre]:max-w-[550px]',
        }"
      >
        <div class="sticky top-0 z-[10] bg-white flex flex-col gap-0">
          <div class="flex justify-between items-center">
            <code class="w-fit bg-slate-100 px-2 py-1 rounded-md text-lg my-2 font-mono">
              <NuxtLink :to="primitive.url" class="netlogo-wiki-link" :external> {{ primitive.name }}</NuxtLink>
            </code>

            <NuxtLink :to="primitive.urlHome" class="flex gap-3 items-center" :external>
              <Icon
                v-if="primitive.metadata?.isConstant"
                name="i-lucide-lock"
                class="w-5 h-5 my-2 text-slate-400"
                title="NetLogo Constant Primitive"
              />
              <Icon
                v-if="primitive.isFromExtension"
                name="i-lucide-puzzle"
                title="NetLogo Extension Primitive"
                class="w-5 h-5 my-2 text-slate-400"
                :aria-label="`This primitive comes from the ${primitive.metadata?.extensionName} NetLogo extension`"
              />
              <Icon
                v-if="primitive.sourceIcon"
                :name="primitive.sourceIcon"
                class="w-6 h-6 my-2 text-slate-400"
                :title="`Source: The ${primitive.source} documentation`"
              />
            </NuxtLink>
          </div>

          <hr class="bg-slate-200 mb-0" />
        </div>

        <div class="prose prose-tight p-0 m-0 mt-1 w-full">
          <MDC
            v-if="primitive.examples"
            :cache-key="`${primitive.name}-examples`"
            tag="div"
            unwrap="p"
            class="dict_entry"
            :value="examples"
          />
          <MDC tag="div" :cache-key="`${primitive.name}-description`" :value="primitive.description ?? ''" />
          <div v-if="primitive.metadata?.isConstant" class="mt-2">
            <h2 class="mt-1 text-sm">
              {{ primitive.metadata?.title }}
            </h2>
            <p class="mt-1 text-sm">Value: {{ primitive.metadata?.constantValue }}</p>
            <p>
              <span
                v-for="constant in primitive.metadata?.constants"
                :key="constant"
                class="inline-block mr-2 mb-1 px-2 py-1 bg-slate-100 rounded-md text-sm"
              >
                {{ constant.name }}: {{ constant.value }}
              </span>
            </p>
            <p class="p-2 bg-yellow-50 border-l-4 border-yellow-400">
              <strong>Note:</strong> This primitive is a constant; its value does not change during program execution.
            </p>
          </div>
        </div>
      </UPageCard>
    </template>
  </UTooltip>
  <code v-else class="netlogo-command" :primitive-name="props.name" aria-label="Unknown NetLogo primitive">
    <span v-if="$slots.default == null" class="netlogo-wiki-link text-red-500 bold">{{ props.name }}</span>
    <slot v-else />
  </code>
</template>

<script setup lang="ts">
import { escapeHTML } from '@repo/utils/std/string';

defineOptions({
  client: false,
});

type Props = {
  name: string;
};

const props = defineProps<Props>();

const { primitive } = await usePrimitive({ name: props.name });

const isNested = inject<boolean>('prim-tooltip-nested', false);
provide('prim-tooltip-nested', true);

const examples = computed(() => {
  return `<h5 class="m-0">${
    primitive.value?.examples
      ?.map(
        (ex) => `
  <span class="prim-example font-mono m-0 block [&_p]:m-0! [&_p]:font-bold">

  ${escapeHTML(ex)}

  </span>
  `,
      )
      .join('') ?? ''
  }</h5>`;
});

const external = computed(() => {
  return primitive.value?.url?.startsWith('http');
});
</script>

<style>
.primitive-tooltip p:last-of-type {
  margin-bottom: 0 !important;
}
</style>
