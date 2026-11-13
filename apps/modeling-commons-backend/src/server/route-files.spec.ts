import { describe, expect, it } from 'vitest';
import { isRouteFileServed } from '#src/server/route-files.ts';

const realtimeRoute = '/realtime/realtime.route.ts';
const modelRoute = '/model/model.route.ts';

describe('isRouteFileServed', () => {
  it('serves only the realtime routes with the sse capability alone', () => {
    const sse = { api: false, sse: true };
    expect(isRouteFileServed(realtimeRoute, sse)).toBe(true);
    expect(isRouteFileServed(modelRoute, sse)).toBe(false);
  });

  it('serves every route but the realtime routes with the api capability alone', () => {
    const api = { api: true, sse: false };
    expect(isRouteFileServed(realtimeRoute, api)).toBe(false);
    expect(isRouteFileServed(modelRoute, api)).toBe(true);
  });

  it('serves both with both capabilities', () => {
    const both = { api: true, sse: true };
    expect(isRouteFileServed(realtimeRoute, both)).toBe(true);
    expect(isRouteFileServed(modelRoute, both)).toBe(true);
  });

  it('never serves a file that is not a route', () => {
    const both = { api: true, sse: true };
    expect(isRouteFileServed('/model/model.service.ts', both)).toBe(false);
    expect(isRouteFileServed('/model/model.route.spec.ts', both)).toBe(false);
  });
});
