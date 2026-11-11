/**
 * Shared types and utilities for Modeling Commons
 */

export type { ApiResponse, PaginatedResponse, ApiError, ModelingCommonsConfig } from './types/index.ts'
export {
  commentContentRules,
  getCommentContentIssue,
  isCommentContentValid,
  normalizeCommentContent,
} from './comment/content.js'
export type { CommentContentIssue } from './comment/content.js'
export { authRules, getUnmetPasswordComplexityRules } from './auth/rules.js'
export type { PasswordComplexityRule } from './auth/rules.js'
export { buildTopicKey } from './realtime/topics.js'
export type {
  StreamControlMessage,
  StreamEvent,
  StreamMessage,
  StreamTopic,
  StreamTopicEvents,
  StreamTopicType,
} from './realtime/topics.js'
