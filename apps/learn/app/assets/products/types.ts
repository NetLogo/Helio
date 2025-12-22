interface Product {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  logoUrl: string;
  iconUrl: string;
  iconName?: string;
  preferredIconUrl?: string;
  productExternalHomePage: string;
  ctaPrimaryUrl?: string;
  ctaPrimaryLabel?: string;
  ctaSecondaryUrl?: string;
  ctaSecondaryLabel?: string;
  prerequisites?: Array<{ type: 'url' | 'product' | 'article' | 'text'; value: string; title?: string; icon?: string }>;
}

export type { Product };
