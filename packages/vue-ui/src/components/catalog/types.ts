export type CatalogItem = {
  title: string
  url?: string
}

export type CatalogItemProps = {
  active?: boolean
  item: CatalogItem
  onSelect?: (item: CatalogItem, event: Event) => void
}

export type CatalogProps = {
  isLoading?: boolean
  items?: Array<CatalogItem>
  selectedItem?: CatalogItem | null
}

export type HeaderSectionProps = {
  title: string
}

export type ItemsListProps = {
  isLoading?: boolean
  isSelected?: (item: CatalogItem) => boolean
  items: Array<CatalogItem>
  onSelect?: (item: CatalogItem, event: Event) => void
}

export type SearchFieldProps = {
  modelValue?: string
  placeholder?: string
}
