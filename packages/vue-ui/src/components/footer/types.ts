import type { VNode } from 'vue'
export type FooterBrandSectionProps = {
  brand?: string | VNode
  brandHref?: string
  span?: number
  hrefAriaLabel?: string
}

export type FooterLink = {
  external?: boolean
  href: string
  title: string
}

export type FooterLinksSectionProps = {
  links: Array<FooterLink>
  span?: number
  title: string
}

export type FooterProps = {
  sections?: number
  show?: boolean
}

export type FooterSectionProps = {
  span?: number
}
