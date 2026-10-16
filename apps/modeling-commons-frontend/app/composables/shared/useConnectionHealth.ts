import {
  useDocumentVisibility,
  useEventListener,
  useIdle,
  useStorage,
  useWindowFocus,
} from "@vueuse/core";
import type { Middleware } from "openapi-fetch";
import { useApi } from "~/composables/api/useApi";
import settings from "~/constants/connection-health.json";

export type ConnectionStatus = "online" | "offline";

type SharedState = {
  status: ConnectionStatus;
  lastCheckedAt: number | null;
};

const DEFAULT_STATE: SharedState = { status: "online", lastCheckedAt: null };

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(settings.backoffBaseMs * 2 ** Math.max(0, attempt), settings.backoffCapMs);
  const spread = (random() * 2 - 1) * settings.backoffJitter;
  return Math.round(base * (1 + spread));
}

let shared: Ref<SharedState> | null = null;

function sharedState(): Ref<SharedState> {
  if (!shared) {
    shared = import.meta.client
      ? useStorage<SharedState>(settings.storageKey, { ...DEFAULT_STATE }, localStorage)
      : ref<SharedState>({ ...DEFAULT_STATE });
  }
  return shared;
}

function setStatus(status: ConnectionStatus, checkedAt?: number): void {
  const s = sharedState();
  if (s.value.status === status && checkedAt === undefined) return;
  s.value = { status, lastCheckedAt: checkedAt ?? s.value.lastCheckedAt };
}

export const connectionMiddleware: Middleware = {
  onResponse() {
    setStatus("online");
  },
  onError({ error }) {
    if (isNetworkError(error)) setStatus("offline");
  },
};

let inFlight: Promise<boolean> | null = null;

async function pingHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.requestTimeoutMs);
  try {
    await useApi().GET("/api/health", { signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function runCheck(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = pingHealth()
    .then((reachable) => {
      setStatus(reachable ? "online" : "offline", Date.now());
      return reachable;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function startLeader(): void {
  const s = sharedState();
  const visibility = useDocumentVisibility();
  const focused = useWindowFocus();
  const { idle } = useIdle(settings.idleTimeoutMs);
  const shouldPoll = computed(
    () =>
      s.value.status === "offline" &&
      visibility.value === "visible" &&
      focused.value &&
      !idle.value,
  );

  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const stop = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (): void => {
    stop();
    if (!shouldPoll.value) return;
    timer = setTimeout(() => {
      void runCheck().then(() => {
        attempt += 1;
        schedule();
      });
    }, backoffDelay(attempt));
  };

  watch(
    shouldPoll,
    (on) => {
      if (!on) {
        stop();
        return;
      }
      attempt = 0;
      void runCheck().then(schedule);
    },
    { immediate: true },
  );

  useEventListener(window, "online", () => {
    void runCheck();
  });
  useEventListener(window, "offline", () => {
    setStatus("offline");
  });
}

let leadershipRequested = false;

function requestLeadership(): void {
  if (leadershipRequested) return;
  leadershipRequested = true;
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) {
    startLeader();
    return;
  }
  void locks.request(settings.lockName, () => {
    startLeader();
    return new Promise<never>(() => {});
  });
}

export function useConnectionHealth() {
  const s = sharedState();

  if (import.meta.client) requestLeadership();

  return {
    status: computed(() => s.value.status),
    isOffline: computed(() => s.value.status === "offline"),
    lastCheckedAt: computed(() => s.value.lastCheckedAt),
    checkNow: runCheck,
  };
}
