export const commentContentRules = {
  length: { min: 1, max: 10_000 },
} as const

export type CommentContentIssue = 'tooShort' | 'tooLong'

export function normalizeCommentContent(content: string): string {
  return content.trim()
}

export function getCommentContentIssue(content: string): CommentContentIssue | null {
  const { length } = normalizeCommentContent(content)
  if (length < commentContentRules.length.min) return 'tooShort'
  if (length > commentContentRules.length.max) return 'tooLong'
  return null
}

export function isCommentContentValid(content: string): boolean {
  return getCommentContentIssue(content) === null
}
