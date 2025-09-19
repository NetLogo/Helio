'use client';
import type { JSX } from 'react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import Catalog from '@/components/catalog';
import useSearchParams from '@/hooks/useSearchParams';
import { useUrlState } from '../hooks/useURLState';

export default function SideCatalog(props: SideCatalogProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const itemsList = useRef<HTMLDivElement>(null);
  const { filteredItems, queryText, setQueryText, onSelect } = useSideCatalog(
    props,
    contentRef,
    itemsList
  );
  const { label, children } = props;

  return (
    <Catalog.TopLevelContainer>
      <Catalog.Container ref={contentRef}>
        <Catalog.MobileHeader
          selectedItemLabel={props.selectedItemLabel}
          itemPrefix={props.itemPrefix}
        />
        <Catalog.Section ref={itemsList}>
          <Catalog.Header title={label}>
            <Catalog.SearchField
              placeholder="Search..."
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
              }}
            />
          </Catalog.Header>
          <Catalog.ItemsList
            items={filteredItems}
            onSelect={onSelect}
            isSelected={props.isSelected}
            isLoading={props.isLoading}
          />
        </Catalog.Section>
      </Catalog.Container>
      {children}
    </Catalog.TopLevelContainer>
  );
}

function useSideCatalog(
  {
    items,
    onSelect: userOnSelect,
    query,
    withRouteTransition,
    scrollMarginTop,
    isLoading,
  }: SideCatalogProps,
  contentRef: React.RefObject<HTMLDivElement | null>,
  itemsList: React.RefObject<HTMLDivElement | null>
): {
  filteredItems: Array<SideCatalogItem>;
  queryText: string;
  setQueryText: React.Dispatch<React.SetStateAction<string>>;
  onSelect: (item: SideCatalogItem, e: React.MouseEvent<HTMLAnchorElement>) => void;
} {
  const [queryText, setQueryText] = useState<string>('');
  const hasQuery = queryText.length > 0;
  const filteredItems = useMemo(() => {
    if (!hasQuery) return items;
    if (!query) return items;
    return query(queryText);
  }, [hasQuery, items, query, queryText]);

  const [urlState] = useUrlState();
  const [searchParams, setSearchParams] = useSearchParams();
  const { query: searchQueryFromUrl = '', parentScrollY = 0 } = urlState;

  useLayoutEffect(() => {
    if (isLoading === true) return;
    if (searchQueryFromUrl) {
      setQueryText(searchQueryFromUrl);
    }

    if (parentScrollY !== 0 && contentRef.current) {
      contentRef.current.scrollTop = Number(parentScrollY);
    }

    const scrollMarginTopValue = scrollMarginTop ?? 0;
    setTimeout(() => {
      const targetLink: HTMLElement | null = document.querySelector(
        `a.${Catalog.constants.activeItemClass}`
      );
      if (contentRef.current && targetLink) {
        contentRef.current.scrollTo({
          top: targetLink.offsetTop - scrollMarginTopValue,
          behavior: 'smooth',
        });

        itemsList.current?.scrollTo({
          top: targetLink.offsetTop - scrollMarginTopValue,
          behavior: 'instant',
        });
      }
    }, 0);

    const sp = new URLSearchParams(searchParams);
    sp.delete('parentScrollY');
    sp.delete('query');
    setSearchParams(sp, { replace: true });

    // We only want to run this on mount, so we disable the exhaustive-deps rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRef, isLoading]);

  function onSelect(item: SideCatalogItem, e: React.MouseEvent<HTMLAnchorElement>): void {
    userOnSelect?.(item, e);
    if (withRouteTransition === true) {
      e.preventDefault();
      const anchor = e.currentTarget;
      const href = anchor.getAttribute('href');
      if (href === null) return;
      const newURL = new URL(href, window.location.href);
      newURL.searchParams.set('query', queryText);
      newURL.searchParams.set('parentScrollY', String(contentRef.current?.scrollTop ?? 0));
      window.location.href = newURL.toString();
    }
  }

  return { filteredItems, queryText, setQueryText, onSelect };
}

type SideCatalogProps = {
  label: string;
  items: Array<SideCatalogItem>;
  onSelect?: (item: SideCatalogItem, e: React.MouseEvent) => void;
  query?: (s0: string) => Array<SideCatalogItem>;
  isSelected?: (item: SideCatalogItem) => boolean;
  isLoading?: boolean;
  itemPrefix?: string;
  selectedItemLabel?: string;
  withRouteTransition?: boolean;
  scrollMarginTop?: number;
  children?: React.ReactNode;
};

export type SideCatalogItem = {
  title: string;
  url?: string;
  icon?: JSX.Element;
};
