import type { FastifyInstance } from 'fastify';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  cookie: string;
}

let userCounter = 0;

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${++userCounter}-${Date.now()}@test.local`;
}

export async function signUp(
  server: FastifyInstance,
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<{ id: string; email: string; name: string }> {
  const email = overrides.email ?? uniqueEmail();
  const name = overrides.name ?? 'Test User';
  const password = overrides.password ?? 'TestPass1!';

  const res = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    payload: { name, email, password },
    headers: { 'content-type': 'application/json' },
  });

  if (res.statusCode >= 400) {
    throw new Error(`Sign-up failed (${res.statusCode}): ${res.body}`);
  }

  const body = JSON.parse(res.body);
  const userId = body.user?.id ?? body.id;

  // Bypass email verification directly in DB
  const { prisma } = server.diContainer.cradle as { prisma: { user: { update: Function } } };
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  return { id: userId, email, name };
}

export async function signIn(
  server: FastifyInstance,
  email: string,
  password = 'TestPass1!',
): Promise<string> {
  const res = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    payload: { email, password },
    headers: { 'content-type': 'application/json' },
  });

  if (res.statusCode >= 400) {
    throw new Error(`Sign-in failed (${res.statusCode}): ${res.body}`);
  }

  const setCookie = res.headers['set-cookie'];
  if (!setCookie) {
    throw new Error('No session cookie returned from sign-in');
  }

  // Combine all cookies into a single header value
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

export async function createAuthenticatedUser(
  server: FastifyInstance,
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<TestUser> {
  const password = overrides.password ?? 'TestPass1!';
  const { id, email, name } = await signUp(server, { ...overrides, password });
  const cookie = await signIn(server, email, password);
  return { id, name, email, cookie };
}

export async function makeAdmin(
  server: FastifyInstance,
  userId: string,
): Promise<void> {
  const { prisma } = server.diContainer.cradle as { prisma: { user: { update: Function } } };
  await prisma.user.update({
    where: { id: userId },
    data: { systemRole: 'admin' },
  });
}
