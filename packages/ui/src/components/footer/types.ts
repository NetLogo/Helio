export type FooterProps = {
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
} & React.HTMLAttributes<HTMLElement>

export type FooterSectionProps = {
  /**
   * Brand content to display (can include logo, text, etc.)
   */
  children?: React.ReactNode;

  /**
   * Optional legal text or additional information
   */
  span?: number;
}

export type FooterBrandSectionProps = {
  /**
   * Optional brand logo or image
   */
  brand?: React.ReactNode;

  /**
   * Optional link for the brand section (e.g., logo link)
   */
  brandHref?: string;
} & FooterSectionProps

export type FooterLinksSectionProps = {
  /**
   * Title for the links section
   */
  title: string;

  /**
   * Array of links to display
   */
  links: Array<FooterLink>;
} & Omit<FooterSectionProps, 'children'>

export type FooterLink = {
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
