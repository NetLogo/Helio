export function formatEventFrame(event: string): string {
  return `event: ${event}\ndata: {}\n\n`;
}

export function formatCommentFrame(text: string): string {
  return `: ${text}\n\n`;
}

export function formatRetryFrame(retryMs: number): string {
  return `retry: ${retryMs}\n\n`;
}
