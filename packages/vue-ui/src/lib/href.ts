import { useRuntimeConfig } from '#app'
export function applyBasePath(href: string | undefined): string {
  const config = useRuntimeConfig()
  const basePathFromConfig = config.public['basePath'] as string | undefined
  const basePath: string = basePathFromConfig ?? ''
  if (typeof href === 'string' && href.startsWith('/')) {
    return href.replace(/^\/+/, basePath + '/')
  }
  return href ?? ''
}
