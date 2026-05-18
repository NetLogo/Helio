import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import env from '#src/config/env.ts';

export const TRACKING_COOKIE_NAME = '_mc_uid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ClientContext = {
  userId: string | null;
  sessionId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  referer: string | null;
  cookie: string | null;
};

export function getClientIp(req: FastifyRequest): string {
  const fromHeaders = env.server.ipAddressHeaders
    .map((h) => req.headers[h] as string | string[] | undefined)
    .map((v) => (Array.isArray(v) ? v[0] : v))
    .find(Boolean);

  return fromHeaders?.split(',')[0]?.trim() ?? req.ip;
}

function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${env.server.ipHashSalt}:${day}`;
}

export function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + dailySalt())
    .digest('hex')
    .slice(0, 32);
}

export function generateUniqueId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=')) || null;
  }
  return null;
}

export function readTrackingCookie(req: FastifyRequest): string | null {
  return parseCookieHeader(req.headers.cookie, TRACKING_COOKIE_NAME);
}

export function setTrackingCookie(reply: FastifyReply, value: string): void {
  const parts = [
    `${TRACKING_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (env.isProduction) parts.push('Secure');
  reply.header('Set-Cookie', parts.join('; '));
}

export function getClientContext(req: FastifyRequest): ClientContext {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'];
  const ref = req.headers['referer'];
  return {
    userId: req.user?.id ?? null,
    sessionId: req.session?.id ?? null,
    ipHash: ip ? hashIp(ip) : null,
    userAgent: typeof ua === 'string' ? ua.slice(0, 512) : null,
    referer: typeof ref === 'string' ? ref.slice(0, 512) : null,
    cookie: readTrackingCookie(req)?.slice(0, 64) ?? null,
  };
}
