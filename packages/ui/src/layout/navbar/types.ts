export interface NavbarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    NavbarDynamicProps {
  id: string;

  brand?: React.ReactNode;
  brandHref?: string;

  children?: React.ReactNode;

  blurBackdrop?: number | string; // Default: "10px"
}

export interface NavbarDynamicProps {
  show?: boolean;
}

export interface NavbarOptions {
  hideOnScroll?: {
    threshold?: number; // Default: 50
    aggregateThreshold?: boolean; // Default: true
  };
}

export type NavbarClientProps = Omit<NavbarProps, keyof NavbarDynamicProps> & {
  options?: NavbarOptions;
};

export type NavLink = {
  title: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
} & React.HTMLAttributes<HTMLAnchorElement>;

export type NavbarMenu = {
  title?: string;
  href?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  active?: boolean;
  dropdownOpen?: boolean;
  columns?: number; // Default: 1
} & React.HTMLAttributes<HTMLDivElement>;

export type NavbarAction = {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLElement>;
