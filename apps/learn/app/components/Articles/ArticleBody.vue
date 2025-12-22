<template>
  <main class="prose min-h-screen" v-bind="dProps.main">
    <ContentRenderer
      :value="article.item"
      tag="article"
      class="prose mt-4 prose-medium prose-text-medium"
      :components="MDCComponents"
      v-bind="dProps.contentRenderer"
    />
    <Surround :surround="surround" v-bind="dProps.surround" />
  </main>
</template>

<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content';
import type { ObjectModel } from '~/data';
import MDCComponents from '../mdc/components';

type Props = {
  article: ObjectModel.Article;
  surround: Array<ContentNavigationItem> | undefined;
  mode?: 'full' | 'medium' | 'tight';
};

const props = withDefaults(defineProps<Props>(), {
  mode: 'full',
});

const dProps = computed(() => {
  return {
    main: props.mode === 'full' ? { class: '' } : { class: 'lg:px-[var(--space-lg)]' },
    contentRenderer:
      props.mode === 'tight'
        ? { class: 'lg:prose-tight' }
        : props.mode === 'medium'
          ? { class: 'lg:prose-medium' }
          : { class: '' },
    surround: props.mode === 'full' ? { class: 'mx-[var(--space-lg)]' } : { class: 'mx-[var(--space-sm)]' },
  };
});
</script>
