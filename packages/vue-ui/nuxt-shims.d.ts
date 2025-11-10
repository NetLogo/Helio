declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Process {
      dev?: boolean
    }
  }
}

declare module '#app' {
  import type { RuntimeConfig } from '@nuxt/schema'

  declare function useRuntimeConfig(): RuntimeConfig
}
declare module '#og-image/app/utils' {
  type FontConfig = {
    name: string
    style?: 'normal' | 'ital'
    weight?: string | number
    path?: string
    key?: string
    absolutePath?: boolean
  }
  type OgImageRuntimeConfig = {
    version: string
    satoriOptions: unknown
    resvgOptions: unknown
    sharpOptions: unknown
    publicStoragePath: string
    defaults: OgImageOptions
    debug: boolean
    baseCacheKey: string
    fonts: Array<FontConfig>
    hasNuxtIcon: boolean
    colorPreference: 'light' | 'dark'
    isNuxtContentDocumentDriven: boolean
    strictNuxtContentPaths: boolean
    zeroRuntime: boolean
    componentDirs?: Array<string>
    app: {
      baseURL: string
    }
  }
  declare function useOgImageRuntimeConfig(): OgImageRuntimeConfig
}

declare module '#site-config/app/composables' {
  type SiteConfig = {
    /**
     * The canonical Site URL.
     *
     * - Build / Prerender: Inferred from CI environment (Netlify, Vercel)
     * - SSR: Inferred from request headers
     * - SPA: Inferred from `window.location`
     *
     * Used by: nuxt-simple-sitemap, nuxt-simple-robots, nuxt-schema-org, nuxt-og-image, etc.
     */
    url: string
    /**
     * The name of the site.
     *
     * - Build / Prerender: Inferred from CI environment (Netlify) or `package.json`
     * - SSR:
     *
     * Used by: nuxt-schema-org, nuxt-seo-kit
     */
    name?: string
    /**
     * Whether the site is indexable by search engines.
     *
     * Allows you to opt-out productions environment from being indexed.
     */
    indexable?: boolean
    /**
     * The environment of the site. Comparable to `process.env.NODE_ENV`.
     */
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    env?: 'production' | 'staging' | 'development' | 'preview' | 'uat' | string
    /**
     * Whether the site uses trailing slash.
     */
    trailingSlash?: boolean
    /**
     * The mapping of the context of each site config value being set.
     */
    _context?: Record<string, string>
    /**
     * Support any keys as site config.
     */
    [key: string]: unknown
  }
  declare function useSiteConfig(): SiteConfig
}
