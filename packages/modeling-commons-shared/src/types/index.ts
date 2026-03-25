/**
 * Core types for Modeling Commons
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T
  success: boolean
  timestamp: string
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: Array<T>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * API Error response
 */
export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}

/**
 * Modeling Commons configuration
 */
export type ModelingCommonsConfig = Record<string, unknown>
