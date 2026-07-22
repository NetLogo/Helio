import { useApi } from "~/composables/api/useApi";

export type ConnectionStatus = "online" | "offline";

const INTERVAL_MS: Record<ConnectionStatus, number> = {
  online: 120_000,
  offline: 15_000,
};

const REQUEST_TIMEOUT_MS = 4_000;

type HealthState = {
  status: Ref<ConnectionStatus>;
  lastCheckedAt: Ref<number | null>;
  refCount: number;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  browserListenersBound: boolean;
};

let state: HealthState | null = null;

function getState(): HealthState {
  if (!state) {
    state = {
      status: ref<ConnectionStatus>("online"),
      lastCheckedAt: ref<number | null>(null),
      refCount: 0,
      timer: null,
      inFlight: false,
      browserListenersBound: false,
    };
  }
  return state;
}

async function pingHealth(): Promise<boolean> {
  const api = useApi();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const { response, error } = await (
      api as unknown as {
        GET: (
          path: string,
          init: { signal: AbortSignal },
        ) => Promise<{
          response?: Response;
          error?: unknown;
        }>;
      }
    ).GET("/api/health", { signal: controller.signal });
    if (error) return false;
    return !!response && response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function scheduleNext(s: HealthState): void {
  if (s.timer) clearTimeout(s.timer);
  if (s.refCount <= 0) return;
  const delay = INTERVAL_MS[s.status.value];
  s.timer = setTimeout(() => {
    void runCheck(s);
  }, delay);
}

async function runCheck(s: HealthState): Promise<void> {
  if (s.inFlight) return;
  s.inFlight = true;
  try {
    const healthy = await pingHealth();
    s.status.value = healthy ? "online" : "offline";
    s.lastCheckedAt.value = Date.now();
  } finally {
    s.inFlight = false;
    scheduleNext(s);
  }
}

function bindBrowserListeners(s: HealthState): void {
  if (s.browserListenersBound || typeof window === "undefined") return;
  s.browserListenersBound = true;
  window.addEventListener("online", () => {
    void runCheck(s);
  });
  window.addEventListener("offline", () => {
    s.status.value = "offline";
    scheduleNext(s);
  });
}

export function useConnectionHealth() {
  const s = getState();

  if (import.meta.client) {
    s.refCount += 1;
    bindBrowserListeners(s);
    if (s.refCount === 1) {
      void runCheck(s);
    }

    onScopeDispose(() => {
      s.refCount = Math.max(0, s.refCount - 1);
      if (s.refCount === 0 && s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
    });
  }

  return {
    status: readonly(s.status),
    isOffline: computed(() => s.status.value === "offline"),
    lastCheckedAt: readonly(s.lastCheckedAt),
    checkNow: () => runCheck(s),
  };
}
