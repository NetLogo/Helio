export const STREAM_EVENTS = {
  notifications: "notifications",
  comments: "comments",
  resync: "resync",
} as const;

export type StreamEvent = (typeof STREAM_EVENTS)[keyof typeof STREAM_EVENTS];

export const STREAM_RECONNECT_BASE_MS = 5_000;
export const STREAM_RECONNECT_MAX_MS = 60_000;
export const STREAM_RECONNECT_JITTER = 0.25;

const STREAM_PATH = "/api/v1/events";

const MODEL_STREAM_ROUTES = new Set([
  "models-id",
  "model-slug",
  "model-version",
  "model-slug-version",
  "models-id-comments-commentId",
  "model-slug-comment-thread",
]);

const STREAMLESS_ROUTES = new Set(["models-id-embed", "model-embed-slug"]);

export type StreamRoute = {
  name?: unknown;
  params: Record<string, unknown>;
};

export function resolveStreamPath(
  route: StreamRoute,
  { modelStreamRefused = false }: { modelStreamRefused?: boolean } = {},
): string | null {
  const name = typeof route.name === "string" ? route.name : "";
  if (STREAMLESS_ROUTES.has(name)) return null;
  if (modelStreamRefused) return STREAM_PATH;
  const modelId = route.params.id;
  if (MODEL_STREAM_ROUTES.has(name) && typeof modelId === "string" && modelId !== "") {
    return `${STREAM_PATH}/models/${encodeURIComponent(modelId)}`;
  }
  return STREAM_PATH;
}

export type StreamGates = {
  path: string | null;
  visible: boolean;
  signedIn: boolean;
  online: boolean;
};

export function shouldOpenStream({ path, visible, signedIn, online }: StreamGates): boolean {
  return path !== null && visible && signedIn && online;
}

export function computeReconnectDelay(attempt: number, random: () => number): number {
  const base = Math.min(STREAM_RECONNECT_BASE_MS * 2 ** attempt, STREAM_RECONNECT_MAX_MS);
  return base * (1 + STREAM_RECONNECT_JITTER * (2 * random() - 1));
}
