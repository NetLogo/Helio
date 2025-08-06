import React, { useState } from 'react';

import { cn } from '@/utils/cn';
import styles from './Navbar.module.scss';

import Anchor from '@/HOC/Anchor';
import { useDebouncedHover } from '@/hooks/useDebouncedHover';
import { isWindowDefined } from '@/utils/client';
import { cssVariable } from '@/utils/styles';
import type {
  NavbarAction,
  NavbarClientProps,
  NavbarMenu,
  NavbarProps,
  NavLink,
} from './types';
import { useNavbar } from './useNavbar';

/**
 * Navbar component
 * @param props - Navbar properties
 * @param props.id - Unique identifier for the navbar
 * @param props.children - Child components to render inside the navbar
 * @param props.brand - Brand name to display
 * @param props.brandHref - URL for the brand link
 * @param props.show - Whether to show the navbar (default: true)
 * @param props.blurBackdrop - Amount of blur for the backdrop (default: 0)
 * @param rest - Any <nav> attributes to apply
 * @returns Navbar component
 *
 * @example - Server Component
 * <Navbar id="main-navbar" brand="NetLogo" brandHref="/" options={options}>
 *    <Navbar.LinksContainer>
 *        <Navbar.Item title="Home" href="/" active>
 *          <Navbar.DropdownItem title="Submenu 1" href="/submenu1" active />
 *        </Navbar.Item>
 *        <Navbar.Item title="Docs" href="/docs" />
 *      </Navbar.LinksContainer>
 *    <Navbar.ActionsContainer>
 *      <Navbar.Action title="GitHub" href="https://github.com/NetLogo" />
 *    </Navbar.ActionsContainer>
 *  </Navbar>
 *
 * @example - Client Component
 * <Navbar.Client id="main-navbar" brand="NetLogo" brandHref="/" options={options}>
 *    <Navbar.LinksContainer>
 *        <Navbar.ItemClient title="Home" href="/" active>
 *          <Navbar.DropdownItem title="Submenu 1" href="/submenu1" active />
 *        </Navbar.ItemClient>
 *        <Navbar.ItemClient title="Docs" href="/docs" />
 *      </Navbar.LinksContainer>
 *    <Navbar.ActionsContainer>
 *      <Navbar.Action title="GitHub" href="https://github.com/NetLogo" />
 *    </Navbar.ActionsContainer>
 *  </Navbar.Client>
 *
 * @summary Navbar component for displaying navigation links and actions.
 * @description This component provides a responsive navigation bar with support for brand display, links,
 *              dropdowns, and actions. It can be used as a server component or a client component.
 *              Client component support interactive features:
 *                  - Debounced hover for dropdowns
 *                  - Hide bar on scroll
 */
const Navbar = ({
  id,
  children,
  brand,
  brandHref,
  className,
  style,
  show = true,
  blurBackdrop = 0,
  ...rest
}: NavbarProps) => {
  return (
    <nav
      className={cn(
        styles.container,
        !show && styles.hide,
        Boolean(blurBackdrop) && styles.blurBackdrop,
        className
      )}
      style={{
        ...cssVariable('--blur-backdrop', blurBackdrop),
        ...(style || {}),
      }}
      id={id}
      data-show={show}
      {...rest}
    >
      <Navbar.MenuToggle id={id} />
      <Navbar.Row>
        <Navbar.AnchorContainer id={id}>
          {brand && (
            <Navbar.BrandContainer href={brandHref}>
              {brand}
            </Navbar.BrandContainer>
          )}
        </Navbar.AnchorContainer>
        {children}
      </Navbar.Row>
      {children}
    </nav>
  );
};

Navbar.Client = ({ options = {}, ...rest }: NavbarClientProps) => {
  const uiProps = useNavbar(options);
  return <Navbar {...rest} {...uiProps} />;
};

Navbar.MenuToggle = ({
  id,
  className,
  ...rest
}: { id: string } & React.HTMLProps<HTMLInputElement>) => (
  <input
    id={id + '-toggle'}
    type="checkbox"
    className={cn(styles.menuToggle, className)}
    {...rest}
  />
);

Navbar.Row = ({
  children,
  className,
  ...rest
}: { children?: React.ReactNode } & React.HTMLProps<HTMLDivElement>) => (
  <div className={cn(styles.row, className)} {...rest}>
    {children}
  </div>
);

Navbar.AnchorContainer = ({
  id,
  children,
  className,
  ...rest
}: {
  id: string;
  children?: React.ReactNode;
} & React.HTMLProps<HTMLDivElement>) => (
  <div className={cn(styles.anchor, className)} {...rest}>
    <label className={styles.hamburger} htmlFor={id + '-toggle'}>
      {' '}
      <span></span>
      <span></span>
      <span></span>{' '}
    </label>
    {children}
  </div>
);

Navbar.BrandContainer = ({
  children,
  href,
  className,
  ...rest
}: {
  children?: React.ReactNode;
  href?: string;
} & React.HTMLProps<HTMLAnchorElement>) => (
  <Anchor href={href} className={cn(styles.brand, className)} {...rest}>
    {children}
  </Anchor>
);

Navbar.LinksContainer = ({
  children,
  className,
  ...rest
}: { children?: React.ReactNode } & React.HTMLProps<HTMLDivElement>) => (
  <div className={cn(styles.menus, className)} {...rest}>
    <div className={styles.links}>{children}</div>
  </div>
);
Navbar.Item = ({
  title,
  href,
  icon,
  active,
  children,
  className,
  columns = 1,
  dropdownOpen = false,
  ...rest
}: NavbarMenu) => {
  return (
    <div
      className={cn(styles.item, active && styles.active, className)}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <Anchor href={href}>{title}</Anchor>
      {children && (
        <div
          className={cn(styles.dropdown, dropdownOpen && styles.open)}
          style={{ ...cssVariable('--columns', columns) }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

Navbar.ItemClient = (props: NavbarMenu) => {
  if (!isWindowDefined()) {
    console.warn(
      'Navbar.ItemClient can only be used in a client-side context.'
    );
    return <Navbar.Item {...props} />;
  }

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { onMouseEnter, onMouseLeave } = useDebouncedHover(
    () => setDropdownOpen(true),
    () => setDropdownOpen(false)
  );

  return (
    <Navbar.Item
      {...props}
      dropdownOpen={dropdownOpen}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};

Navbar.DropdownItem = ({
  title,
  href,
  icon,
  active,
  className,
  ...rest
}: NavLink) => {
  return (
    <Anchor
      href={href}
      className={cn(active && styles.active, className)}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {title}
    </Anchor>
  );
};

Navbar.ActionsContainer = ({
  children,
  className,
  ...rest
}: { children?: React.ReactNode } & React.HTMLProps<HTMLDivElement>) => (
  <div className={cn(styles.actions, className)} {...rest}>
    {children}
  </div>
);
Navbar.Action = ({
  title,
  href,
  icon,
  onClick,
  className,
  ...rest
}: NavbarAction) => {
  if (!href && !onClick) {
    console.warn('Navbar.Action requires either href or onClick prop.');
    return null;
  }
  const Component = href ? Anchor : 'button';
  return (
    <Component
      href={href}
      className={cn(styles.action, className)}
      onClick={onClick}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {title}
    </Component>
  );
};

export default Navbar;
