import type { Callback } from "../../types";

type Error = { code?: string | number; [key: string]: unknown };

export interface Logger {
  log: (...args: Array<unknown>) => void;
  warn: (...args: Array<unknown>) => void;
}

export let ws: WebSocket | undefined = undefined;

export function log(...args: Array<unknown>): void {}

export function createWebSocket(
  url: string,
  logger: Logger = { log, warn: log },
): {
  connect: (retry?: boolean) => void;
  send: (data: any) => void;
  addHandler: (callback: Callback) => void;
} | null {
  if (!window.WebSocket) {
    logger.warn("Your browser does not support WebSocket");
    return null;
  }

  const onOpen = (): void => logger.log("WS connected!");

  const onError = (e: unknown): void => {
    switch ((e as Error).code) {
      case "ECONNREFUSED":
        connect(true);
        break;
      default:
        logger.warn("Socket error:", e);
        break;
    }
  };

  const onClose = (e: unknown): void => {
    // https://tools.ietf.org/html/rfc6455#section-11.7
    if ((e as Error).code === 1000 || (e as Error).code === 1005) {
      // normal close
      logger.log("Socket closed");
    } else {
      // unknown error
      connect(true);
    }
  };

  const handlers: Array<Callback> = [];
  const onMessage = (message: { data: string }): void => {
    let data: object = {};
    try {
      data = JSON.parse(message.data);
    } catch (err) {
      logger.warn("Error parsing message:", message.data);
      return;
    }
    handlers.forEach((handler) => handler(data));
  };

  const send = (data: unknown): void => {
    if (ws) {
      ws.send(JSON.stringify(data));
    }
  };

  let retries = 0;
  const connect = (retry = false): void => {
    if (retry) {
      retries++;
      if (retries < 5) {
        logger.log("Reconnecting...");
        setTimeout(connect, 1000);
      } else {
        logger.warn("Giving up!");
      }
      return;
    }

    if (ws) {
      try {
        ws.close();
      } catch (err) {
        // empty
      }
      ws = undefined;
    }

    // websocket base url
    if (url) {
      const wsUrl = `${url}ws`;

      // debug
      logger.log(`WS connect to ${wsUrl}`);

      // do it
      ws = new WebSocket(wsUrl);
      ws.onopen = onOpen;
      ws.onmessage = onMessage;
      ws.onerror = onError;
      ws.onclose = onClose;
    }
  };

  // automatically connect on use
  if (!ws) {
    connect();
  }

  return {
    connect,
    send,
    addHandler(callback: Callback): void {
      if (typeof callback === "function") {
        handlers.push(callback);
      }
    },
  };
}
