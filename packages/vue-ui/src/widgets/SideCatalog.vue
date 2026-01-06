<template>
  <CatalogTopLevelContainer>
    <Catalog ref="contentRef">
      <CatalogMobileHeader :selected-item-label="selectedItemLabel" :item-prefix="itemPrefix" />
      <CatalogSection ref="itemsList">
        <CatalogHeader :title="label">
          <CatalogSearchField placeholder="Search..." :model-value="queryText" @update:model-value="setQueryText" />
        </CatalogHeader>
        <CatalogItemsList
          :items="filteredItems"
          :on-select="onItemSelect"
          :is-selected="isSelected"
          :is-loading="isLoading"
        />
      </CatalogSection>
    </Catalog>
    <slot />
  </CatalogTopLevelContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useCssModule, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { onBeforeMount } from 'vue'
import Catalog from '../components/catalog/Catalog.vue'
import CatalogHeader from '../components/catalog/CatalogHeader.vue'
import CatalogItemsList from '../components/catalog/CatalogItemsList.vue'
import CatalogMobileHeader from '../components/catalog/CatalogMobileHeader.vue'
import CatalogSearchField from '../components/catalog/CatalogSearchField.vue'
import CatalogSection from '../components/catalog/CatalogSection.vue'
import CatalogTopLevelContainer from '../components/catalog/CatalogTopLevelContainer.vue'

const props = withDefaults(defineProps<SideCatalogProps>(), {
  isLoading: false,
  scrollMarginTop: 0,
  withRouteTransition: false,
  selectedItemLabel: '',
  itemPrefix: 'item: ',
  onSelect: undefined,
  isSelected: () => false,
  query: undefined,
})

const emit = defineEmits<{
  select: [item: SideCatalogItem, e: Event]
}>()

const route = useRoute()
const router = useRouter()

const contentRef = ref<{ $el?: HTMLElement }>()

const itemsList = ref<{ $el?: HTMLElement }>()
const queryText = ref<string>('')

const hasQuery = computed(() => queryText.value.length > 0)
const filteredItems = computed(() => {
  if (!hasQuery.value) return props.items
  if (!props.query) return props.items
  return props.query(queryText.value)
})

function onItemSelect(item: SideCatalogItem, e: Event): void {
  props.onSelect?.(item, e)
  emit('select', item, e)

  if (props.withRouteTransition && e instanceof MouseEvent) {
    e.preventDefault()
    const anchor = e.currentTarget as HTMLAnchorElement
    const href = anchor.getAttribute('href')
    if (href === null) return

    const newURL = new URL(href, window.location.href)
    newURL.searchParams.set('query', queryText.value)

    newURL.searchParams.set('parentScrollY', String(contentRef.value?.$el?.scrollTop ?? 0))

    const baseURL = router.options.history.base
    const pathname = newURL.pathname.replace(baseURL, '/').replace('//', '/')
    router.push(pathname + newURL.search + newURL.hash).catch(() => {
      // ignore
    })
  }
}

function setQueryText(value: string): void {
  queryText.value = value
  scrollToActive()
}

const style = useCssModule()
const haveCompletedMount = ref(false)

const onMountHasStarted = (): void => {
  if (haveCompletedMount.value) return
  if (props.isLoading) return
  if (!(contentRef.value || itemsList.value)) return

  const parentScrollY = route.query['parentScrollY']

  if (parentScrollY !== undefined && parentScrollY !== '0' && contentRef.value?.$el) {
    contentRef.value.$el.scrollTop = Number(parentScrollY)
  }

  scrollToActive()

  const newQuery = { ...route.query }
  delete newQuery['parentScrollY']

  router
    .replace({ query: newQuery })
    .then(() => {
      haveCompletedMount.value = true
    })
    .catch(() => {
      // ignore
    })
}

const scrollToActive = (): void => {
  const scrollMarginTopValue = props.scrollMarginTop
  setTimeout(() => {
    if (!(contentRef.value?.$el && itemsList.value?.$el)) return
    const contentEl: HTMLElement = contentRef.value.$el
    const itemsEl: HTMLElement = itemsList.value.$el

    const targetLink = document.querySelector(`a.${style['active']}`)
    if (targetLink) {
      contentEl.scrollTo({
        behavior: 'smooth',
        top: (targetLink as HTMLElement).offsetTop - scrollMarginTopValue,
      })

      itemsEl.scrollTo({
        behavior: 'instant',
        top: (targetLink as HTMLElement).offsetTop - scrollMarginTopValue,
      })
    } else {
      contentEl.scrollTo({ top: 0 })
    }
  }, 0)
}

watch(
  () => [props.isLoading],
  () => {
    if (props.isLoading) return
    const searchQuery = route.query['query'] as string
    if (searchQuery) setQueryText(searchQuery)

    onMountHasStarted()
  }
)

onMounted(() => {
  onMountHasStarted()
})

onBeforeMount(() => {
  const searchQuery = route.query['query'] as string
  if (searchQuery) setQueryText(searchQuery)

  const newQuery = { ...route.query }
  delete newQuery['query']

  router.replace({ query: newQuery }).catch(() => {
    // ignore
  })
})

export type SideCatalogItem = {
  icon?: unknown // Vue component or string
  title: string
  url?: string
}

export type SideCatalogProps = {
  isLoading?: boolean
  isSelected?: (item: SideCatalogItem) => boolean
  itemPrefix?: string
  items: Array<SideCatalogItem>
  label: string
  onSelect?: (item: SideCatalogItem, e: Event) => void
  query?: (s: string) => Array<SideCatalogItem>
  scrollMarginTop?: number
  selectedItemLabel?: string
  withRouteTransition?: boolean
}
</script>

<style module src="../components/catalog/Catalog.module.scss" />
