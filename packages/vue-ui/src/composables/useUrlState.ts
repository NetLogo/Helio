import { computed, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type UrlState = {
  parentScrollY?: number
  query?: string
}

export function useSearchParams(): readonly [
  ComputedRef<URLSearchParams>,
  (params: URLSearchParams, options?: { replace?: boolean }) => void,
] {
  const route = useRoute()
  const router = useRouter()

  const searchParams = computed(() => new URLSearchParams(route.query as Record<string, string>))

  function setSearchParams(params: URLSearchParams, options?: { replace?: boolean }): void {
    const query: Record<string, string> = {}
    params.forEach((value, key) => {
      query[key] = value
    })

    if (options?.replace) {
      router.replace({ query })
    } else {
      router.push({ query })
    }
  }

  return [searchParams, setSearchParams] as const
}

export function useUrlState(): readonly [ComputedRef<UrlState>, (newState: Partial<UrlState>) => void] {
  const route = useRoute()
  const router = useRouter()

  const urlState = computed<UrlState>(() => ({
    parentScrollY: route.query['parentScrollY'] ? Number(route.query['parentScrollY']) : 0,
    query: route.query['query'] as string,
  }))

  function updateUrlState(newState: Partial<UrlState>): void {
    const newQuery = { ...route.query }

    if (newState.query !== undefined) {
      if (newState.query) {
        newQuery['query'] = newState.query
      } else {
        delete newQuery['query']
      }
    }

    if (newState.parentScrollY !== undefined) {
      if (newState.parentScrollY) {
        newQuery['parentScrollY'] = String(newState.parentScrollY)
      } else {
        delete newQuery['parentScrollY']
      }
    }

    router.replace({ query: newQuery })
  }

  return [urlState, updateUrlState] as const
}
