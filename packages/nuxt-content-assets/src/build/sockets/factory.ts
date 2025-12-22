import type { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import type { Callback } from "../../types";

/**
 * WebSocket Server
 * @see https://www.npmjs.com/package/ws
 */
export function createWebSocket(): {
  wss: WebSocketServer;

  serve: (req: IncomingMessage, socket?: import("net").Socket, head?: Buffer) => void;
  broadcast: (data: unknown) => void;
  addHandler: (callback: Callback) => void;
  close: () => Promise<void>;
} {
  const wss = new WebSocketServer({ noServer: true });

  const serve = (
    req: IncomingMessage,
    socket = req.socket,
    head: Buffer = Buffer.alloc(0),
  ): void => {
    wss.handleUpgrade(req, socket, head, (client: WebSocket) =>
      wss.emit("connection", client, req),
    );
  };

  const broadcast = (data: unknown): void => {
    data = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data as string);
      }
    }
  };

  const handlers: Array<Callback> = [];
  const addHandler = (callback: Callback): void => {
    handlers.push(callback);
  };

  wss.on("connection", (socket) => {
    socket.addEventListener("message", (event): void => {
      let data: object | undefined = undefined;
      try {
        // @ts-expect-error -- Handled
        data = JSON.parse(event.data ?? "{}");
      } catch {
        // empty
      }

      if (data) {
        handlers.forEach((callback) => {
          callback(data);
        });
      }
    });
  });

  return {
    wss,
    serve,
    broadcast,
    addHandler,
    close: async (): Promise<void> => {
      wss.clients.forEach((client: WebSocket) => {
        client.close();
      });
      return new Promise((resolve) => {
        wss.close(resolve as unknown as () => void);
      });
    },
  };
}
