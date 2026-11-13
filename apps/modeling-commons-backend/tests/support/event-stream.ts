import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { pollUntil } from './poll.ts';

export type EventStream = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  received: () => string;
  countEvents: (event: string) => number;
  listMessages: () => Array<StreamFrameMessage>;
  ended: () => boolean;
  close: () => void;
};

export type StreamFrameMessage = {
  event?: unknown;
  topic?: { type?: unknown; id?: unknown };
};

function listMessages(text: string): Array<StreamFrameMessage> {
  return text
    .split('\n\n')
    .slice(0, -1)
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice('data: '.length)) as StreamFrameMessage);
}

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
        countEvents: (event) =>
          listMessages(text).filter((message) => message.event === event).length,
        listMessages: () => listMessages(text),
        ended: () => ended,
        close: () => request.destroy(),
      });
    });
  });
}

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  await pollUntil(predicate, Boolean, { timeoutMs, intervalMs: 50 });
}
