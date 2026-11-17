import type { StreamControlMessage, StreamMessage } from "~/features/server-stream/types";

export function parseStreamMessage(data: unknown): StreamMessage | StreamControlMessage | null {
  if (typeof data !== "string") return null;
  try {
    const message: unknown = JSON.parse(data);
    return typeof message === "object" && message !== null && "event" in message
      ? (message as StreamMessage | StreamControlMessage)
      : null;
  } catch {
    return null;
  }
}
