const maxSummaryLength = 2000;

function summarize(value: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > maxSummaryLength ? `${text.slice(0, maxSummaryLength)}...` : text;
}

export async function pollUntil<T>(
  read: () => Promise<T> | T,
  isDone: (value: T) => boolean,
  { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number },
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (isDone(value)) return value;
    if (Date.now() >= deadline) {
      throw new Error(`Condition not met within ${timeoutMs}ms. Last value: ${summarize(value)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
