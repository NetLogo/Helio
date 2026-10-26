export const ServerRole = {
  API: 'api',
  WORKER: 'worker',
  STANDALONE: 'standalone',
} as const;
export type ServerRole = (typeof ServerRole)[keyof typeof ServerRole];

export type ServerCapabilities = {
  api: boolean;
  worker: boolean;
};

export const isApiEnabled = (role: ServerRole) =>
  role === ServerRole.API || role === ServerRole.STANDALONE;
export const isWorkerEnabled = (role: ServerRole) =>
  role === ServerRole.WORKER || role === ServerRole.STANDALONE;

export const getServerRole = (role: ServerRole | undefined, isDevelopment: boolean) =>
  role ?? (isDevelopment ? ServerRole.STANDALONE : ServerRole.API);

export const getServerCapabilities = (role: ServerRole): ServerCapabilities => ({
  api: isApiEnabled(role),
  worker: isWorkerEnabled(role),
});
