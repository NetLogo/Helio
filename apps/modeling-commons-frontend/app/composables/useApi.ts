import type { ApiResponse, ApiError } from '@repo/modeling-commons-shared'

interface RequestOptions {
  method?: string
  body?: unknown
  [key: string]: unknown
}

/**
 * Composable for API communication with the modeling commons backend
 */
export function useApi() {
  const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:3000/api'

  /**
   * Make an API request
   */
  async function request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    try {
      const response = await $fetch<ApiResponse<T>>(endpoint, {
        baseURL: apiBase,
        ...(options as Record<string, unknown>),
      })

      if (!response.success) {
        throw new Error(response.data as unknown as string)
      }

      return response.data
    } catch (error) {
      const err = error as ApiError
      console.error(`API Error (${err.code}):`, err.message)
      throw error
    }
  }

  /**
   * GET request
   */
  async function get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async function post<T>(endpoint: string, body: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body })
  }

  /**
   * PUT request
   */
  async function put<T>(endpoint: string, body: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body })
  }

  /**
   * DELETE request
   */
  async function del<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' })
  }

  return {
    get,
    post,
    put,
    delete: del,
    request,
  }
}
