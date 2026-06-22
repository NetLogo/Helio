const MAILPIT_BASE = process.env.MAILPIT_URL ?? "http://localhost:8025";

interface SearchResponse {
  messages: { ID: string }[];
}

interface MessageResponse {
  Text?: string;
  HTML?: string;
}

export async function waitForMessageTo(
  recipient: string,
  opts: { timeout?: number; interval?: number } = {},
): Promise<string> {
  const timeout = opts.timeout ?? 15_000;
  const interval = opts.interval ?? 500;
  const deadline = Date.now() + timeout;

  // The whole query value must be percent-encoded so the `+` in
  // `e2e+<stamp>@example.test` survives as a literal rather than a space.
  const query = encodeURIComponent(`to:"${recipient}"`);
  const searchUrl = `${MAILPIT_BASE}/api/v1/search?query=${query}`;

  while (Date.now() < deadline) {
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = (await res.json()) as SearchResponse;
      const newest = data.messages[0];
      if (newest) {
        return newest.ID;
      }
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Mailpit: no message to "${recipient}" within ${timeout}ms`);
}

export async function extractLink(messageId: string, pattern: RegExp): Promise<string> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/message/${messageId}`);
  if (!res.ok) {
    throw new Error(`Mailpit: failed to fetch message ${messageId} (${res.status})`);
  }

  const message = (await res.json()) as MessageResponse;
  const match = message.Text?.match(pattern) ?? message.HTML?.match(pattern);
  if (!match) {
    throw new Error(`Mailpit: no link matching ${pattern} in message ${messageId}`);
  }

  return match[0];
}

export async function clearMessages(): Promise<void> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/messages`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Mailpit: failed to clear messages (${res.status})`);
  }
}
