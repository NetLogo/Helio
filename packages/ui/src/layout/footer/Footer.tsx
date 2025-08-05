import { cn } from '@/utils/cn';
import { cssVariable, maybeCSSVariable } from '@/utils/styles';
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
  ...rest
}: FooterProps) => {
  if (!show) return null;

  return (
    <footer
      {...rest}
      className={cn(
        'w-full mt-5 px-4 gap-3',
        'bg-gray-50 border-t border-gray-200',
        styles.footer,
        className
      )}
      style={{
        ...cssVariable('--section-span', 12 / sections),
        ...(rest.style || {}),
      }}
    >
      {children}
    </footer>
  );
};

/**
 * Main container for footer content with responsive layout
 */
Footer.Container = ({ children }: { children?: React.ReactNode }) => (
  <div className="mx-auto py-8">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">{children}</div>
  </div>
);

/**
 * Brand section with flexible content
 */
Footer.BrandSection = ({
  children,
  brand,
  brandHref,
  span,
}: FooterBrandSectionProps) => (
  <div
    className={cn('px-1 py-2', styles.section, styles.brandSection)}
    style={{ ...maybeCSSVariable('--section-span', span) }}
  >
    <div className="flex flex-col items-start">
      {brand && (
        <a href={brandHref} className="flex items-center space-x-2">
          {brand}
        </a>
      )}
      {children}
    </div>
  </div>
);

/**
 * Links section with title and list of links
 */
Footer.LinksSection = ({ title, links, span }: FooterLinksSectionProps) => (
  <div
    className={cn('px-1 py-2', styles.section)}
    style={{ ...maybeCSSVariable('--section-span', span) }}
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

/**
 * Individual link item
 */
Footer.Link = ({ title, href, external = false }: FooterLink) => (
  <li>
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {title}
    </a>
  </li>
);

/**
 * Copyright and legal information section
 */
Footer.Section = ({ children, span }: FooterSectionProps) => (
  <div
    className={cn('lg:col-span-5 px-1 py-2', styles.section)}
    style={{ ...maybeCSSVariable('--section-span', span) }}
  >
    <div className="text-gray-700 space-y-3">{children}</div>
  </div>
);

/**
 * Helper component for creating link elements within copyright text
 */
Footer.CopyrightLink = ({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) => (
  <a
    href={href}
    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
    {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
  >
    {children}
  </a>
);

export default Footer;
