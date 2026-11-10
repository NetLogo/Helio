import { createSharedComposable, tryOnScopeDispose, useDocumentVisibility } from "@vueuse/core";
import {
  computeReconnectDelay,
  resolveStreamPath,
  shouldOpenStream,
  STREAM_EVENTS,
  type StreamEvent,
} from "~/components/shared/event-stream";

export type StreamStatus = "open" | "connecting" | "closed";

type StreamHandler = () => void;

const PUSHED_EVENTS = Object.values(STREAM_EVENTS);

function useEventStreamImpl() {
  const status = ref<StreamStatus>("closed");
  const handlers = new Map<StreamEvent, Set<StreamHandler>>();

  const emit = (name: StreamEvent) => {
    for (const handler of [...(handlers.get(name) ?? [])]) handler();
  };

  const on = (name: StreamEvent, handler: StreamHandler) => {
    const registered = handlers.get(name) ?? new Set<StreamHandler>();
    registered.add(handler);
    handlers.set(name, registered);
    const off = () => registered.delete(handler);
    tryOnScopeDispose(off);
    return off;
  };

  const stream = { status: readonly(status), on };
  if (!import.meta.client || typeof EventSource === "undefined") return stream;

  const apiBase = useRuntimeConfig().public.apiBase as string;
  const route = useRouter().currentRoute;
  const user = useUser();
  const visibility = useDocumentVisibility();
  const { isOffline } = useConnectionHealth();

  const modelStreamRefused = ref(false);
  let openedPath: string | null = null;
  watch(
    route,
    (next) => {
      modelStreamRefused.value = false;
      if (resolveStreamPath(next) !== openedPath) openedPath = null;
    },
    { flush: "sync" },
  );

  const target = computed(() => {
    const path = resolveStreamPath(route.value, { modelStreamRefused: modelStreamRefused.value });
    const open = shouldOpenStream({
      path,
      visible: visibility.value === "visible",
      signedIn: user.value.isLoggedIn,
      online: !isOffline.value,
    });
    return open ? path : null;
  });

  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failedAttempts = 0;

  const cancelReconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const close = () => {
    cancelReconnect();
    source?.close();
    source = null;
    status.value = "closed";
  };

  const scheduleReconnect = () => {
    close();
    const delay = computeReconnectDelay(failedAttempts, Math.random);
    failedAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (target.value !== null) open(target.value);
    }, delay);
  };

  const open = (path: string) => {
    close();
    const next = new EventSource(`${apiBase}${path}`, { withCredentials: true });
    source = next;
    status.value = "connecting";
    next.addEventListener("open", () => {
      failedAttempts = 0;
      openedPath = path;
      status.value = "open";
      emit(STREAM_EVENTS.resync);
    });
    next.addEventListener("error", () => {
      if (source !== next) return;
      if (next.readyState !== EventSource.CLOSED) {
        status.value = "connecting";
        return;
      }
      if (openedPath !== path) modelStreamRefused.value = true;
      scheduleReconnect();
    });
    for (const name of PUSHED_EVENTS) next.addEventListener(name, () => emit(name));
  };

  watch(
    target,
    (path) => {
      if (path === null) close();
      else open(path);
    },
    { immediate: true },
  );

  tryOnScopeDispose(close);

  return stream;
}

export const useEventStream = import.meta.server
  ? useEventStreamImpl
  : /* @__PURE__ */ createSharedComposable(useEventStreamImpl);
