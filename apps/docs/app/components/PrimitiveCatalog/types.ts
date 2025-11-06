import { PrimitiveCatalogSchema, type PrimitiveCatalog } from '@repo/netlogo-docs/primitive-index';
import type { CatalogItem } from '@repo/vue-ui/components/catalog/types';
import type { SideCatalogItem } from '@repo/vue-ui/widgets/SideCatalog.vue';

type PrimitiveCatalogProps = {
  surround?: unknown;
} & PrimitiveCatalog;

type CatalogItemData = {
  id: string;
} & CatalogItem;

export { PrimitiveCatalogSchema };
export type { CatalogItemData, PrimitiveCatalogProps, SideCatalogItem };
