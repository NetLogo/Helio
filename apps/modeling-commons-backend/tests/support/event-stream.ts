import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';

export type EventStream = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  received: () => string;
  countEvents: (event: string) => number;
  ended: () => boolean;
  close: () => void;
};

export async function listenOnEphemeralPort(server: FastifyInstance): Promise<number> {
  if (!server.server.listening) await server.listen({ port: 0, host: '127.0.0.1' });
  return (server.server.address() as AddressInfo).port;
}

export function openEventStream(
  port: number,
  path: string,
  headers: Record<string, string>,
): Promise<EventStream> {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path, headers });
    request.on('error', reject);
    request.on('response', (response) => {
      let text = '';
      let ended = false;
      response.on('close', () => {
        ended = true;
      });
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        text += chunk;
      });
      response.on('error', () => undefined);
      resolve({
        statusCode: response.statusCode ?? 0,
        headers: response.headers,
        received: () => text,
        countEvents: (event) => text.split(`event: ${event}\n`).length - 1,
        ended: () => ended,
        close: () => request.destroy(),
      });
    });
  });
}

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!(await predicate())) {
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}
