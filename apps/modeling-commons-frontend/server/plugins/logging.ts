import pino from "pino";
import { consola } from "consola";
import { trace } from "@opentelemetry/api";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { trace_id: traceId, span_id: spanId };
  },
});

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV === "production") {
    consola.setReporters([
      {
        log(obj) {
          const level = obj.level >= 3 ? "info" : obj.level >= 2 ? "warn" : "error";
          const msg = obj.args
            .map((a) => {
              if (a instanceof Error) return `${a.message}\n${a.stack ?? ""}`;
              if (typeof a === "object") return JSON.stringify(a);
              return String(a);
            })
            .join(" ");
          logger[level]({ tag: obj.tag || undefined }, msg);
        },
      },
    ]);
  }

  nitroApp.hooks.hook("request", (event) => {
    event.context._start = performance.now();
  });

  nitroApp.hooks.hook("afterResponse", (event) => {
    const start = event.context._start as number | undefined;
    const url = event.path ?? event.node.req.url ?? "";

    // Skip probes and Nuxt's build output; they'd swamp everything else.
    // if (/^\/(healthz?|_nuxt\/|__nuxt|favicon\.ico)/.test(url)) return;

    logger.info({
      method: event.method ?? event.node.req.method,
      url,
      statusCode: event.node.res.statusCode,
      responseTime: start ? performance.now() - start : undefined,
    });
  });

  nitroApp.hooks.hook("error", (error, { event }) => {
    logger.error(
      {
        method: event?.method,
        url: event?.path,
        statusCode: event?.node.res.statusCode,
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      },
      "unhandled error",
    );
  });
});
