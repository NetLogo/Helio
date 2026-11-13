import { createSharedComposable, tryOnScopeDispose, useDocumentVisibility } from "@vueuse/core";
import { createDirectConnection } from "~/features/server-stream/direct-connection";
import { serverStreamRules } from "~/features/server-stream/rules";
import type { ServerStreamConnection } from "~/features/server-stream/types";

function createIdleConnection(): ServerStreamConnection {
  return {
    status: readonly(ref("closed")),
    subscribe: () => () => undefined,
  };
}

function useServerStreamConnectionImpl(): ServerStreamConnection {
  if (!import.meta.client || typeof EventSource === "undefined") return createIdleConnection();

  const user = useUser();
  const visibility = useDocumentVisibility();
  const { isOffline } = useConnectionHealth();

  const connection = createDirectConnection({
    url: `${useRuntimeConfig().public.apiBase as string}${serverStreamRules.path}`,
    allowed: computed(
      () => visibility.value === "visible" && user.value.isLoggedIn && !isOffline.value,
    ),
  });

  tryOnScopeDispose(connection.close);
  return connection;
}

export const useServerStreamConnection = import.meta.server
  ? useServerStreamConnectionImpl
  : /* @__PURE__ */ createSharedComposable(useServerStreamConnectionImpl);
