export const ServerRole = {
  API: 'api',
  WORKER: 'worker',
  SSE: 'sse',
  STANDALONE: 'standalone',
} as const;
export type ServerRole = (typeof ServerRole)[keyof typeof ServerRole];

export type ServerCapabilities = {
  api: boolean;
  worker: boolean;
  sse: boolean;
};

export const isApiEnabled = (role: ServerRole) =>
  role === ServerRole.API || role === ServerRole.STANDALONE;
export const isWorkerEnabled = (role: ServerRole) =>
  role === ServerRole.WORKER || role === ServerRole.STANDALONE;
export const isSseEnabled = (role: ServerRole) =>
  role === ServerRole.SSE || role === ServerRole.STANDALONE;

export const getServerRole = (role: ServerRole | undefined, isDevelopment: boolean): ServerRole => {
  if (role) return role;
  if (isDevelopment) return ServerRole.STANDALONE;
  throw new Error(
    `SERVER_ROLE must be set outside development to one of: ${Object.values(ServerRole).join(', ')}`,
  );
};

export const getServerCapabilities = (role: ServerRole): ServerCapabilities => ({
  api: isApiEnabled(role),
  worker: isWorkerEnabled(role),
  sse: isSseEnabled(role),
});
