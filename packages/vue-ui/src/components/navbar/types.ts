import type { VNode } from 'vue'

export type NavbarAction = {
  href?: string
  icon?: string
  noNuxtLink?: boolean
  onClick?: () => void
  title?: string
}

export type NavbarMenu = {
  active?: boolean
  columns?: number
  dropdownOpen?: boolean
  href?: string
  icon?: string
  title?: string
}

export type NavbarProps = {
  blurBackdrop?: number | string
  brand?: string | VNode
  brandHref?: string
  id: string
  show?: boolean
}

export type NavLink = {
  active?: boolean
  href: string
  icon?: string
  title: string
}
