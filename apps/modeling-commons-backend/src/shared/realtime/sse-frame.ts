import type { StreamControlMessage, StreamMessage } from '@repo/modeling-commons-shared';

export function formatMessageFrame(message: StreamMessage | StreamControlMessage): string {
  return `data: ${JSON.stringify(message)}\n\n`;
}

export function formatCommentFrame(text: string): string {
  return `: ${text}\n\n`;
}

export function formatRetryFrame(retryMs: number): string {
  return `retry: ${retryMs}\n\n`;
}
