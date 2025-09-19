import type React from 'react';
import type { JSX } from 'react';

export type HamburgerProps = {
  className?: string;
};

export type ActiveItemProps = {
  className?: string;
  selectedItemLabel?: string;
  itemPrefix?: string;
} & React.ComponentProps<'div'>;

export type SearchFieldProps = {
  placeholder?: string;
  id?: string;
} & React.ComponentProps<'input'>;

export type HeaderSectionProps = {
  title: string;
  children?: React.ReactNode;
} & React.ComponentProps<'div'>;

type OnSelectCallback = (item: CatalogItem, e: React.MouseEvent<HTMLAnchorElement>) => void;
export type CatalogItemComponentProps = {
  item: CatalogItem;
  onSelect?: OnSelectCallback;
  active?: boolean;
} & Omit<React.ComponentProps<'li'>, 'onSelect'>;

export type ItemsListProps = {
  className?: string;
  items: Array<CatalogItem>;
  onSelect?: OnSelectCallback;
  isSelected?: (item: CatalogItem) => boolean;
  isLoading?: boolean;
};

export type MobileHeaderProps = {
  className?: string;
  selectedItemLabel?: string;
  hamburgerProps?: Omit<HamburgerProps, 'className'>;
  itemPrefix?: string;
};

export type ContentProps = {
  className?: string;
  title: string;
  items: Array<CatalogItem>;
  onSelect?: (item: CatalogItem) => void;
  headerProps?: Omit<HeaderSectionProps, 'className' | 'title'>;
  itemsListProps?: Omit<ItemsListProps, 'className' | 'items' | 'onSelect'>;
};

export type CatalogProps = {
  children?: React.ReactNode;
} & React.ComponentProps<'div'>;

export type CatalogItem = {
  title: string;
  url?: string;
  icon?: JSX.Element;
};
