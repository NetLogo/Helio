import type { APIEvent, Faro, TransportItem } from "@grafana/faro-web-sdk";

export default defineNuxtPlugin({
  name: "faro",
  parallel: true, // lazy plugin

  async setup(nuxtApp) {
    const config = useRuntimeConfig();
    const faroUrl = config.public.faroUrl as string;
    // unset in dev unless NUXT_PUBLIC_FARO_URL is exported to test locally
    if (!faroUrl) return;

    let faro: Faro | null = null;
    const buffered: BufferedError[] = [];
    const MAX_BUFFERED = 20; // a render loop must not exhaust memory

    const onError = (event: ErrorEvent) => {
      if (buffered.length >= MAX_BUFFERED) return;
      buffered.push({
        error: event.error instanceof Error ? event.error : new Error(event.message),
        source: "window.onerror",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (buffered.length >= MAX_BUFFERED) return;
      buffered.push({
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        source: "unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Vue errors never reach window.onerror (Nuxt installs an errorHandler),
    // so this hook must forward them for the lifetime of the app.
    nuxtApp.hook("vue:error", (error, _instance, info) => {
      const err = error instanceof Error ? error : new Error(String(error));
      if (faro) {
        faro.api.pushError(err, {
          context: { source: "vue:error", info: String(info) },
        });
        return;
      }
      if (buffered.length >= MAX_BUFFERED) return;
      buffered.push({ error: err, source: "vue:error", info: String(info) });
    });

    const whenIdle = (fn: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(fn, { timeout: 3000 });
      } else {
        setTimeout(fn, 1000);
      }
    };

    whenIdle(async () => {
      try {
        const [{ initializeFaro, getWebInstrumentations, LogLevel }, { TracingInstrumentation }] =
          await Promise.all([import("@grafana/faro-web-sdk"), import("@grafana/faro-web-tracing")]);

        const scrubUrl = (url: string | undefined): string | undefined => {
          if (!url) return url;
          try {
            const u = new URL(url, window.location.origin);
            return u.origin + u.pathname;
          } catch {
            return url.split("?")[0];
          }
        };

        const apiBase = config.public.apiBase as string | undefined;
        const apiUrl = new URL(apiBase || "/api", window.location.origin);
        const apiUrlPattern = new RegExp(
          "^" + (apiUrl.origin + apiUrl.pathname).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        );

        const instance = initializeFaro({
          url: faroUrl,
          app: {
            name: "modeling-commons-frontend",
            version: config.public.appVersion as string,
            environment: config.public.faroEnvironment as string,
          },
          sessionTracking: {
            enabled: true,
            persistent: false, // sessionStorage; dies with the tab
          },
          consoleInstrumentation: {
            // avoid leaking personal data; only warn and error get through
            disabledLevels: [LogLevel.LOG, LogLevel.DEBUG, LogLevel.INFO, LogLevel.TRACE],
          },
          instrumentations: [
            ...getWebInstrumentations({ captureConsole: true }),
            new TracingInstrumentation({
              instrumentationOptions: {
                // trace headers to your own API only, never third parties
                propagateTraceHeaderCorsUrls: [apiUrlPattern],
              },
            }),
          ],
          beforeSend: (item) => {
            const payload = item.payload as Payload;
            if (item.meta?.user) {
              delete item.meta.user.email;
              delete item.meta.user.username;
              delete item.meta.user.id;
            }
            if (payload?.url) payload.url = scrubUrl(payload.url);
            if (item.meta?.page?.url) {
              item.meta.page.url = scrubUrl(item.meta.page.url);
            }
            // Faro records user input as breadcrumbs; keep the element,
            // drop whatever was typed into it.
            if (payload?.attributes?.value) delete payload.attributes.value;
            return item;
          },
        });

        faro = instance;
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);

        for (const b of buffered) {
          instance.api.pushError(b.error, {
            context: {
              source: b.source,
              info: b.info ?? "",
              buffered: "true",
            },
          });
        }
        buffered.length = 0;

        nuxtApp.hook("app:error", (error) => {
          instance.api.pushError(error instanceof Error ? error : new Error(String(error)), {
            context: { source: "app:error" },
          });
        });
      } catch (e) {
        console.error(e);
        // A failed telemetry load must never break the app. Leave the
        // buffer listeners attached and carry on.
      }
    });
  },
});

type BufferedError = {
  error: Error;
  source: string;
  info?: string;
};

type Payload = {
  url?: string;
  meta?: {
    user?: {
      email?: string;
      username?: string;
      id?: string;
    };
    page?: {
      url?: string;
    };
  };
  attributes?: Record<string, unknown>;
} & TransportItem<APIEvent>["payload"];
