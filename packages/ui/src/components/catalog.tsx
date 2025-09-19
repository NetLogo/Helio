import ToggleStateProvider, { useToggle } from '@/context/ToggleProvider';
import { cn } from '@/lib/utils/cn';
import type { ComponentProps, JSX } from 'react';
import React from 'react';
import styles from './catalog/Catalog.module.scss';
import type {
  ActiveItemProps,
  CatalogItemComponentProps,
  CatalogProps,
  HamburgerProps,
  HeaderSectionProps,
  ItemsListProps,
  MobileHeaderProps,
  SearchFieldProps,
} from './catalog/types';
import Hamburger from './hamburger';
import { Input } from './input';

function CatalogHamburger({ className }: HamburgerProps): JSX.Element {
  const { toggle } = useToggle();
  return (
    <Hamburger
      id={`hamburger-catalog`}
      className={cn(styles['hamburger'], className)}
      onClick={() => {
        toggle(Catalog.constants.toggleKey);
      }}
    />
  );
}

function ActiveItem({
  className,
  selectedItemLabel,
  itemPrefix,
  ...rest
}: ActiveItemProps): JSX.Element {
  return (
    <div {...rest} className={cn(styles['active-item'], className)}>
      <span className={styles['active-item-name']}>
        <i>{itemPrefix} </i>
        {selectedItemLabel ?? ''}
      </span>
    </div>
  );
}

function SearchField({ className, ...rest }: SearchFieldProps): JSX.Element {
  const { id = 'search-input', placeholder = 'Search primitives...' } = rest;
  return (
    <Input
      className={cn(styles['search-bar'], className)}
      type="text"
      {...rest}
      id={id}
      placeholder={placeholder}
    />
  );
}

function HeaderSection({ className, title, children, ...rest }: HeaderSectionProps): JSX.Element {
  return (
    <div {...rest} className={cn(styles['heading-sticky'], className)}>
      <span className={styles['heading-title']}>{title}</span>
      {children}
    </div>
  );
}

function CatalogItemComponent({
  item,
  onSelect,
  active,
  ...rest
}: CatalogItemComponentProps): JSX.Element {
  const { title, url } = item;

  return (
    <li key={`${title}-${url ?? 'NOURL'}`} title={title} aria-label={title} {...rest}>
      <a
        href={url}
        onClick={(e) => onSelect?.(item, e)}
        className={cn(active === true ? styles['active'] : '')}
      >
        {title}
      </a>
    </li>
  );
}

const ItemsList = React.forwardRef<HTMLUListElement, ItemsListProps>(
  ({ className, items, onSelect, isSelected, isLoading }, ref): JSX.Element => {
    if (isLoading === true) {
      return (
        <ul
          ref={ref}
          className={cn(styles['heading-items'], 'flex flex-col items-center', className)}
        >
          <li className="pointer-events-none italic mx-auto w-full">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <a key={i} className="bg-red-400 w-full block my-1 animate-pulse animate-shimmer">
                  <span className="opacity-0">Loading...</span>
                </a>
              ))}
          </li>
        </ul>
      );
    }

    if (items.length === 0) {
      return (
        <ul ref={ref} className={cn(styles['heading-items'], className)}>
          <li className="pointer-events-none italic">No items found</li>
        </ul>
      );
    }

    return (
      <ul ref={ref} className={cn(styles['heading-items'], className)}>
        {items.map((item) => (
          <CatalogItemComponent
            key={`${item.title}-${item.url ?? 'NOURL'}`}
            item={item}
            onSelect={onSelect}
            active={isSelected ? isSelected(item) : false}
          />
        ))}
      </ul>
    );
  }
);
ItemsList.displayName = 'ItemsList';

function MobileHeader({
  className,
  selectedItemLabel,
  hamburgerProps,
  itemPrefix,
}: MobileHeaderProps): JSX.Element {
  return (
    <div className={cn(styles['heading-section'], styles['sidebar-folded'], className)}>
      <CatalogHamburger {...hamburgerProps} />
      <ActiveItem selectedItemLabel={selectedItemLabel} itemPrefix={itemPrefix} />
    </div>
  );
}

const Section = React.forwardRef<
  HTMLDivElement,
  { children?: React.ReactNode } & ComponentProps<'div'>
>(({ children, className, ...rest }, ref): JSX.Element => {
  return (
    <div
      {...rest}
      ref={ref}
      className={cn(styles['item-list'], styles['heading-section'], className)}
    >
      {children}
    </div>
  );
});
Section.displayName = 'Section';

function TopLevelContainer({
  children,
  className,
  ...rest
}: { children?: React.ReactNode } & ComponentProps<'div'>): JSX.Element {
  return (
    <div className={cn('sidebar-top-level', styles['sidebar-layout'], className)} {...rest}>
      {children}
    </div>
  );
}

function Root({ children, className, ...rest }: CatalogProps): JSX.Element {
  const { toggles } = useToggle();
  const isHamburgerActive = toggles[Catalog.constants.toggleKey] ?? false;
  return (
    <section
      {...rest}
      className={cn(styles['sidebar'], isHamburgerActive ? styles['menu-active'] : '', className)}
    >
      {children}
    </section>
  );
}
/**
 * @example
 * ```tsx
 * <Catalog.TopLevelContainer>
 *   <Catalog.Container>
 *     <Catalog.Section>
 *       <Catalog.MobileHeader selectedItem={selectedItem} hamburgerProps={{}} />
 *     </Catalog.Section>
 *     <Catalog.Section>
 *       <Catalog.Header title="Dictionary">
 *         <Catalog.SearchField placeholder="Search..." onChange={...} />
 *       </Catalog.Header>
 *       <Catalog.ItemsList items={items} onSelect={...} />
 *     </Catalog.Section>
 *   </Catalog.Container>
 *   <div>Content goes here</div>
 * </Catalog.TopLevelContainer>
 * ```
 */
const Container = React.forwardRef<HTMLDivElement, CatalogProps>(
  ({ children, className, ...rest }, ref): JSX.Element => {
    return (
      <ToggleStateProvider>
        <Root ref={ref} className={className} {...rest}>
          {children}
        </Root>
      </ToggleStateProvider>
    );
  }
);
Container.displayName = 'Container';

const Catalog = {
  TopLevelContainer,
  Container,
  Root,
  Section,
  Hamburger,
  MobileHeader,
  Header: HeaderSection,
  SearchField,
  ItemsList,
  ActiveItem,
  CatalogItem: CatalogItemComponent,
  constants: {
    toggleKey: 'hamburger',
    activeItemClass: styles['active'],
  },
};

export default Catalog;
