import { useNuxt } from "@nuxt/kit";
import type { Server } from "http";
import { listen } from "listhen";
import { isObject, log } from "../../runtime/utils";
import type { Callback, SocketInstance } from "../../types";
import { createWebSocket } from "./factory";

type SocketServer = ReturnType<typeof createWebSocket>;

type Handler = {
  channel: string;
  callback: Callback;
};

function makeChannelBroker(ws: SocketServer): {
  broadcast: (channel: string, data: unknown) => void;
  addHandler: (channel: string, callback: Callback) => void;
} {
  const handlers: Array<Handler> = [];

  const broadcast = (channel: string, data: unknown): void => {
    ws.broadcast({ channel, data });
  };

  const addHandler = (channel: string, callback: Callback): void => {
    handlers.push({ channel, callback });
  };

  ws.addHandler(function (message: unknown): void {
    if (isObject(message)) {
      const { channel } = message;
      handlers
        .filter((handler) => handler.channel === channel || handler.channel === "*")
        .forEach((handler) => {
          handler.callback(message);
        });
    }
  });

  return {
    broadcast,
    addHandler,
  };
}

const ws = createWebSocket();

const broker = makeChannelBroker(ws);

async function setupSocketServer(channel: string, handler?: Callback): Promise<SocketInstance> {
  const nuxt = useNuxt();
  nuxt.hook("nitro:init", async (nitro) => {
    if (!nuxt._socketServer) {
      // @ts-expect-error -- Peer dependency
      const defaults = nuxt.options.runtimeConfig.content.watch || {
        port: 4001,
      };
      const port = defaults.port;
      const { server, url } = await listen(() => "Nuxt Content Assets", {
        hostname: defaults.hostname,
        port: {
          port: port + 1,
          portRange: [port + 1, port + 40],
        },
        showURL: false,
      });

      // set initialized
      nuxt._socketServer = server;

      // start server
      server.on("upgrade", ws.serve);

      // share URL
      const wsUrl = url.replace("http", "ws");
      log(`Websocket listening on "${wsUrl}"`);
      nitro.options.runtimeConfig.public.sockets = {
        wsUrl,
      };

      // close on nuxt close
      nitro.hooks.hook("close", async () => {
        await ws.close();
        await server.close();
      });
    }
  });

  // return
  const instance = {
    send(data: unknown): SocketInstance {
      broker.broadcast(channel, data);
      return this;
    },
    addHandler(callback: Callback): SocketInstance {
      broker.addHandler(channel, callback);
      return this;
    },
  };

  // assign
  if (handler) {
    instance.addHandler(handler);
  }

  // return
  return instance;
}

declare module "@nuxt/schema" {
  interface Nuxt {
    _socketServer: Server;
  }
}

export { setupSocketServer };
