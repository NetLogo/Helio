import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

const { pinoMock, loggerMock, setReportersMock, getActiveSpanMock } = vi.hoisted(() => {
  const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    loggerMock,
    pinoMock: vi.fn(() => loggerMock),
    setReportersMock: vi.fn(),
    getActiveSpanMock: vi.fn(),
  };
});

vi.mock("pino", () => ({ default: pinoMock }));
vi.mock("consola", () => ({ consola: { setReporters: setReportersMock } }));
vi.mock("@opentelemetry/api", () => ({ trace: { getActiveSpan: getActiveSpanMock } }));

type Hooks = Record<string, (...args: unknown[]) => void>;

let plugin: (nitroApp: { hooks: { hook: (name: string, fn: never) => void } }) => void;
let pinoOptions: { mixin: () => Record<string, string> };

function installPlugin() {
  const hooks: Hooks = {};
  plugin({
    hooks: {
      hook: (name, fn) => {
        hooks[name] = fn;
      },
    },
  });
  return hooks;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    context: {} as Record<string, unknown>,
    path: "/api/v1/models",
    method: "GET",
    node: { req: { url: "/api/v1/models", method: "GET" }, res: { statusCode: 200 } },
    ...overrides,
  };
}

beforeAll(async () => {
  vi.stubGlobal("defineNitroPlugin", (fn: unknown) => fn);
  const mod = await import("~~/server/plugins/logging");
  plugin = mod.default as typeof plugin;
  pinoOptions = pinoMock.mock.calls[0]![0] as typeof pinoOptions;
});

beforeEach(() => {
  loggerMock.info.mockClear();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  setReportersMock.mockClear();
  getActiveSpanMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pino mixin", () => {
  // Catches trace correlation silently disappearing from log lines.
  it("returns trace_id and span_id from the active span", () => {
    getActiveSpanMock.mockReturnValue({
      spanContext: () => ({ traceId: "abc123", spanId: "def456" }),
    });
    expect(pinoOptions.mixin()).toEqual({ trace_id: "abc123", span_id: "def456" });
  });

  // Catches a crash when logging outside of any active span.
  it("returns an empty object when there is no active span", () => {
    getActiveSpanMock.mockReturnValue(undefined);
    expect(pinoOptions.mixin()).toEqual({});
  });
});

describe("consola reporter", () => {
  function installReporter() {
    vi.stubEnv("NODE_ENV", "production");
    installPlugin();
    const reporters = setReportersMock.mock.calls[0]![0] as {
      log: (obj: { level: number; args: unknown[]; tag?: string }) => void;
    }[];
    return reporters[0]!;
  }

  // Catches the reporter hijacking pretty console output during local dev.
  it("is not installed outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    installPlugin();
    expect(setReportersMock).not.toHaveBeenCalled();
  });

  // Catches an inverted or shifted consola-to-pino level mapping.
  it("maps consola levels to pino info/warn/error", () => {
    const reporter = installReporter();
    reporter.log({ level: 3, args: ["verbose"] });
    reporter.log({ level: 2, args: ["warning"] });
    reporter.log({ level: 0, args: ["fatal"] });
    expect(loggerMock.info).toHaveBeenCalledWith({ tag: undefined }, "verbose");
    expect(loggerMock.warn).toHaveBeenCalledWith({ tag: undefined }, "warning");
    expect(loggerMock.error).toHaveBeenCalledWith({ tag: undefined }, "fatal");
  });

  // Catches errors serializing as "[object Object]" or losing their stack.
  it("formats Error, object, and primitive args into one message", () => {
    const reporter = installReporter();
    const err = new Error("boom");
    err.stack = "STACK";
    reporter.log({ level: 3, args: ["failed:", err, { code: 42 }] });
    expect(loggerMock.info).toHaveBeenCalledWith(
      { tag: undefined },
      'failed: boom\nSTACK {"code":42}',
    );
  });

  // Catches the tag being dropped, which breaks filtering by module in Loki.
  it("forwards the consola tag", () => {
    const reporter = installReporter();
    reporter.log({ level: 3, args: ["hi"], tag: "nitro" });
    expect(loggerMock.info).toHaveBeenCalledWith({ tag: "nitro" }, "hi");
  });
});

describe("request/afterResponse hooks", () => {
  // Catches access logs missing method, status, or timing.
  it("logs method, url, statusCode, and responseTime for a timed request", () => {
    const hooks = installPlugin();
    const event = makeEvent();
    hooks.request!(event);
    expect(event.context._start).toBeTypeOf("number");
    hooks.afterResponse!(event);
    expect(loggerMock.info).toHaveBeenCalledWith({
      method: "GET",
      url: "/api/v1/models",
      statusCode: 200,
      responseTime: expect.any(Number),
    });
  });

  // Catches a crash or bogus duration when the request hook never ran.
  it("logs responseTime as undefined without a recorded start", () => {
    const hooks = installPlugin();
    hooks.afterResponse!(makeEvent());
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ responseTime: undefined }),
    );
  });

  // Catches the skip filter breaking and probe/asset noise flooding Loki.
  it.each(["/healthz", "/health", "/_nuxt/entry.js", "/__nuxt_error", "/favicon.ico"])(
    "skips %s",
    (url) => {
      const hooks = installPlugin();
      hooks.afterResponse!(makeEvent({ path: url }));
      expect(loggerMock.info).not.toHaveBeenCalled();
    },
  );

  // Catches the skip regex overmatching and dropping real traffic.
  it("still logs application routes", () => {
    const hooks = installPlugin();
    hooks.afterResponse!(makeEvent({ path: "/models/abc" }));
    expect(loggerMock.info).toHaveBeenCalledOnce();
  });

  // Catches losing the url when event.path is absent.
  it("falls back to the raw request url when event.path is missing", () => {
    const hooks = installPlugin();
    hooks.afterResponse!(makeEvent({ path: undefined }));
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/v1/models" }),
    );
  });
});

describe("error hook", () => {
  // Catches unhandled errors logging without message/stack/name.
  it("logs the error shape with request context", () => {
    const hooks = installPlugin();
    const error = new Error("kaput");
    error.stack = "STACK";
    hooks.error!(error, { event: makeEvent({ node: { req: {}, res: { statusCode: 500 } } }) });
    expect(loggerMock.error).toHaveBeenCalledWith(
      {
        method: "GET",
        url: "/api/v1/models",
        statusCode: 500,
        err: { message: "kaput", stack: "STACK", name: "Error" },
      },
      "unhandled error",
    );
  });

  // Catches a crash when an error fires outside of a request context.
  it("tolerates a missing event", () => {
    const hooks = installPlugin();
    hooks.error!(new Error("early"), { event: undefined });
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ method: undefined, url: undefined }),
      "unhandled error",
    );
  });
});
