import React from 'react';

export interface HamburgerProps {
  className?: string;
}

export interface ActiveItemProps extends React.ComponentProps<'div'> {
  className?: string;
  selectedItemLabel?: string;
  itemPrefix?: string;
}

export interface SearchFieldProps extends React.ComponentProps<'input'> {
  placeholder?: string;
  id?: string;
}

export interface HeaderSectionProps extends React.ComponentProps<'div'> {
  title: string;
  children?: React.ReactNode;
}

type OnSelectCallback = (item: CatalogItem, e: React.MouseEvent<HTMLAnchorElement>) => void;
export interface CatalogItemComponentProps extends Omit<React.ComponentProps<'li'>, 'onSelect'> {
  item: CatalogItem;
  onSelect?: OnSelectCallback;
  active?: boolean;
}

export interface ItemsListProps {
  className?: string;
  items: Array<CatalogItem>;
  onSelect?: OnSelectCallback;
  isSelected?: (item: CatalogItem) => boolean;
  isLoading?: boolean;
}

export interface MobileHeaderProps {
  className?: string;
  selectedItemLabel?: string;
  hamburgerProps?: Omit<HamburgerProps, 'className'>;
  itemPrefix?: string;
}

export interface ContentProps {
  className?: string;
  title: string;
  items: Array<CatalogItem>;
  onSelect?: (item: CatalogItem) => void;
  headerProps?: Omit<HeaderSectionProps, 'className' | 'title'>;
  itemsListProps?: Omit<ItemsListProps, 'className' | 'items' | 'onSelect'>;
}

export interface CatalogProps extends React.ComponentProps<'div'> {
  children?: React.ReactNode;
}

export interface CatalogItem {
  title: string;
  url?: string;
  icon?: React.ComponentType<any>;
}
