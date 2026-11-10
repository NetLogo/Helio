import type { ServerCapabilities } from '#src/config/role.ts';

const routeFilePattern = /\.(route|resolver)\.ts$/;
const realtimeRouteFileSuffix = '/realtime.route.ts';

export function isRouteFileServed(
  filePath: string,
  capabilities: Pick<ServerCapabilities, 'api' | 'sse'>,
): boolean {
  if (!routeFilePattern.test(filePath)) return false;
  return filePath.endsWith(realtimeRouteFileSuffix) ? capabilities.sse : capabilities.api;
}
