import Anchor from '@/HOC/Anchor';
import { cn } from '@/lib/utils/cn';
import { cssVariable, maybeCSSVariable } from '@/lib/utils/styles';
import type { JSX } from 'react';
import React from 'react';
import styles from './Footer.module.scss';
import type {
  FooterBrandSectionProps,
  FooterLink,
  FooterLinksSectionProps,
  FooterProps,
  FooterSectionProps,
} from './types';

/**
 * Footer component
 * @param props - Footer properties
 * @param props.show - Whether to show the footer (default: true)
 * @param props.children - Child components to render inside the footer
 * @param props.className - Additional CSS classes
 * @param rest - Any <footer> attributes to apply
 * @returns Footer component
 *
 * @example
 * <Footer sections={3}>
 *   <Footer.Container>
 *     <Footer.BrandSection>
 *       <img src="/images/logo.png" alt="Company Logo" />
 *       <p>Your company description here.</p>
 *     </Footer.BrandSection>
 *     <Footer.LinksSection
 *       title="Related Links"
 *       links={[
 *         { title: "Home", href: "/" },
 *         { title: "About", href: "/about" },
 *       ]}
 *     />
 *     <Footer.CopyrightSection>
 *       <p>Copyright © 2024 Your Company. All rights reserved.</p>
 *     </Footer.CopyrightSection>
 *   </Footer.Container>
 * </Footer>
 *
 * @summary Footer component for displaying brand, links, and copyright information.
 * @description This component provides a responsive footer with support for brand display,
 *              link sections, and copyright information. Uses Tailwind CSS for styling.
 */
const Footer = ({
  show = true,
  sections = 3,
  children,
  className,
  style,
  ...rest
}: FooterProps): JSX.Element | null => {
  if (!show) return null;

  return (
    <footer
      className={cn(
        'w-full mt-5 px-4 py-0 gap-3',
        'bg-gray-50 border-t border-gray-200',
        styles['footer'],
        className
      )}
      style={{
        ...cssVariable('--section-span', 12 / sections),
        ...(style ?? {}),
      }}
      {...rest}
    >
      {children}
    </footer>
  );
};

/**
 * Main container for footer content with responsive layout
 */
Footer.Container = function Container({
  children,
  className,
  ...rest
}: { children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('mx-auto py-8', className)} {...rest}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">{children}</div>
    </div>
  );
};

/**
 * Brand section with flexible content
 */
Footer.BrandSection = function BrandSection({
  children,
  brand,
  brandHref,
  span,
  className,
  style,
  ...rest
}: FooterBrandSectionProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('px-1 py-2', styles['section'], styles['brandSection'], className)}
      style={{ ...maybeCSSVariable('--section-span', span), ...style }}
      {...rest}
    >
      <div className="flex flex-col items-start">
        {brand !== undefined && (
          <Anchor href={brandHref} className="flex items-center space-x-2">
            {brand}
          </Anchor>
        )}
        {children}
      </div>
    </div>
  );
};

/**
 * Links section with title and list of links
 */
Footer.LinksSection = function LinksSection({
  title,
  links,
  span,
  className,
  style,
  ...rest
}: FooterLinksSectionProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('px-1 py-2', styles['section'], className)}
      style={{ ...maybeCSSVariable('--section-span', span), ...style }}
      {...rest}
    >
      <div>
        <h5 className="mt-0 mb-4 text-lg font-semibold text-gray-900">{title}</h5>
        <ul className="space-y-2">
          {links.map((link, index) => (
            <Footer.Link key={index} {...link} />
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Individual link item
 */
Footer.Link = function Link({
  title,
  href,
  external = false,
  className,
  ...rest
}: FooterLink & React.HTMLAttributes<HTMLAnchorElement>): JSX.Element {
  return (
    <li>
      <Anchor href={href} className={cn(className)} external={external} {...rest}>
        {title}
      </Anchor>
    </li>
  );
};

/**
 * Copyright and legal information section
 */
Footer.Section = function Section({
  children,
  span,
  className,
  style = {},
  ...rest
}: FooterSectionProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('lg:col-span-5 px-1 py-2', styles['section'], className)}
      style={{ ...maybeCSSVariable('--section-span', span), ...style }}
      {...rest}
    >
      <div className="text-gray-700 space-y-3">{children}</div>
    </div>
  );
};

Footer.CopyrightLink = function CopyrightLink({
  href,
  children,
  external = false,
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
} & React.HTMLAttributes<HTMLAnchorElement>): JSX.Element {
  return (
    <Anchor
      href={href}
      className={cn(
        'text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200',
        className
      )}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      {...rest}
    >
      {children}
    </Anchor>
  );
};
export default Footer;
