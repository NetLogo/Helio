export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Whether to show the footer (default: true)
   */
  show?: boolean;

  /**
   * Child components to render inside the footer
   */
  children?: React.ReactNode;

  /**
   * Number of sections in the footer layout (default: 3)
   */
  sections?: number;
}

export interface FooterSectionProps {
  /**
   * Brand content to display (can include logo, text, etc.)
   */
  children?: React.ReactNode;

  /**
   * Optional legal text or additional information
   */
  span?: number;
}

export interface FooterBrandSectionProps extends FooterSectionProps {
  /**
   * Optional brand logo or image
   */
  brand?: React.ReactNode;

  /**
   * Optional link for the brand section (e.g., logo link)
   */
  brandHref?: string;
}

export interface FooterLinksSectionProps
  extends Omit<FooterSectionProps, 'children'> {
  /**
   * Title for the links section
   */
  title: string;

  /**
   * Array of links to display
   */
  links: FooterLink[];
}

export interface FooterLink {
  /**
   * Link title/text
   */
  title: string;

  /**
   * Link URL
   */
  href: string;

  /**
   * Whether to open link in new tab (default: false)
   */
  external?: boolean;
}
